import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

// Components
import Navigation from './components/Navigation';
import Search from './components/Search';
import Home from './components/Home';

// ABIs
import RealEstate from './abis/RealEstate.json'
import Escrow from './abis/Escrow.json'

// Config
import config from './config.json';

function App() {
  const [provider, setProvider] = useState(null)
  const [escrow, setEscrow] = useState(null)

  const [account, setAccount] = useState(null)

  const [homes, setHomes] = useState([])
  const [home, setHome] = useState({})
  const [toggle, setToggle] = useState(false);

const loadBlockchainData = async () => {
  // 1) Force MetaMask onto Hardhat (31337)
  await (async () => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x7A69" }],
      });
    } catch (e) {
      if (e.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0x7A69",
            chainName: "Hardhat",
            rpcUrls: ["http://127.0.0.1:8545"],
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          }],
        });
      } else {
        throw e;
      }
    }
  })();

  // 2) Single source of truth: MetaMask provider
  const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
  setProvider(web3Provider);

  // 3) Ensure account + network
  const accounts = await web3Provider.send("eth_requestAccounts", []);
  const account = ethers.utils.getAddress(accounts[0]);
  setAccount(account);

  const network = await web3Provider.getNetwork();
  if (network.chainId !== 31337) {
    throw new Error(`Wrong chain: ${network.chainId}. Need 31337.`);
  }

  // 4) Addresses from config
  const reAddress = config[network.chainId].realEstate.address;
  const esAddress = config[network.chainId].escrow.address;

  // 5) HARD CHECK: code must exist at both addresses
  const [reCode, esCode] = await Promise.all([
    web3Provider.getCode(reAddress),
    web3Provider.getCode(esAddress),
  ]);
  if (reCode === "0x") {
    throw new Error(`No RealEstate code at ${reAddress} on chain ${network.chainId}. Did you redeploy & update config.json?`);
  }
  if (esCode === "0x") {
    throw new Error(`No Escrow code at ${esAddress} on chain ${network.chainId}. Did you redeploy & update config.json?`);
  }

  // 6) One signer for everything
  const signer = web3Provider.getSigner();

  const realEstate = new ethers.Contract(reAddress, RealEstate, signer);
  const escrow = new ethers.Contract(esAddress, Escrow, signer);

  // 7) Load data
  const totalSupply = await realEstate.totalSupply();
  const homesArr = [];
  for (let i = 1; i <= totalSupply; i++) {
    const uri = await realEstate.tokenURI(i);
    const res = await fetch(uri);
    homesArr.push(await res.json());
  }
  setHomes(homesArr);
  setEscrow(escrow);

  // 8) Account change listener (keeps same provider)
  window.ethereum.on('accountsChanged', async () => {
    const a = await web3Provider.send("eth_requestAccounts", []);
    setAccount(ethers.utils.getAddress(a[0]));
  });
};


  useEffect(() => {
    loadBlockchainData()
  }, [])

  const togglePop = (home) => {
    setHome(home)
    toggle ? setToggle(false) : setToggle(true);
  }

  return (
    <div>
      <Navigation account={account} setAccount={setAccount} />
      <Search />

      <div className='cards__section'>

        <h3>Homes For You</h3>

        <hr />

        <div className='cards'>
          {homes.map((home, index) => (
            <div className='card' key={index} onClick={() => togglePop(home)}>
              <div className='card__image'>
                <img src={home.image} alt="Home" />
              </div>
              <div className='card__info'>
                <h4>{home.attributes[0].value} ETH</h4>
                <p>
                  <strong>{home.attributes[2].value}</strong> bds |
                  <strong>{home.attributes[3].value}</strong> ba |
                  <strong>{home.attributes[4].value}</strong> sqft
                </p>
                <p>{home.address}</p>
              </div>
            </div>
          ))}
        </div>

      </div>

      {toggle && (
        <Home home={home} provider={provider} account={account} escrow={escrow} togglePop={togglePop} />
      )}

    </div>
  );
}

export default App;