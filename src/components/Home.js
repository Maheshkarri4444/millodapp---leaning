import { ethers } from 'ethers';
import { useEffect, useState } from 'react';
import close from '../assets/close.svg';

const Home = ({ home, provider, account, escrow, togglePop }) => {
  const [hasBought, setHasBought] = useState(false);
  const [hasLended, setHasLended] = useState(false);
  const [hasInspected, setHasInspected] = useState(false);
  const [hasSold, setHasSold] = useState(false);
  const [buyer, setBuyer] = useState(null);
  const [lender, setLender] = useState(null);
  const [inspector, setInspector] = useState(null);
  const [seller, setSeller] = useState(null);
  const [owner, setOwner] = useState(null);
  const [isLoading, setIsLoading] = useState({
    buy: false,
    inspect: false,
    lend: false,
    sell: false,
  });

  const fetchDetails = async () => {
    try {
      const buyer = await escrow.buyer(home.id);
      setBuyer(buyer);
      const hasBought = await escrow.approval(home.id, buyer);
      setHasBought(hasBought);

      const seller = await escrow.seller();
      setSeller(seller);
      const hasSold = await escrow.approval(home.id, seller);
      setHasSold(hasSold);

      const lender = await escrow.lender();
      setLender(lender);
      const hasLended = await escrow.approval(home.id, lender);
      setHasLended(hasLended);

      const inspector = await escrow.inspector();
      setInspector(inspector);
      const hasInspected = await escrow.inspectionPassed(home.id);
      setHasInspected(hasInspected);
    } catch (error) {
      console.error('Error fetching details:', error);
    }
  };

  const fetchOwner = async () => {
    try {
      if (await escrow.isListed(home.id)) return;
      const owner = await escrow.buyer(home.id);
      setOwner(owner);
    } catch (error) {
      console.error('Error fetching owner:', error);
    }
  };

  const buyHandler = async () => {
    setIsLoading({ ...isLoading, buy: true });
    try {
      const escrowAmount = await escrow.escrowAmount(home.id);
      const signer = await provider.getSigner();
      let transaction = await escrow.connect(signer).depositEarnest(home.id, { value: escrowAmount });
      await transaction.wait();
      transaction = await escrow.connect(signer).approveSale(home.id);
      await transaction.wait();
      setHasBought(true);
    } catch (error) {
      console.error('Error in buyHandler:', error);
    } finally {
      setIsLoading({ ...isLoading, buy: false });
    }
  };

  const inspectHandler = async () => {
    setIsLoading({ ...isLoading, inspect: true });
    try {
      const signer = await provider.getSigner();
      const transaction = await escrow.connect(signer).updateInspectionStatus(home.id, true);
      await transaction.wait();
      setHasInspected(true);
    } catch (error) {
      console.error('Error in inspectHandler:', error);
    } finally {
      setIsLoading({ ...isLoading, inspect: false });
    }
  };

  const lendHandler = async () => {
    setIsLoading({ ...isLoading, lend: true });
    try {
      const signer = await provider.getSigner();
      const transaction = await escrow.connect(signer).approveSale(home.id);
      await transaction.wait();
      const lendAmount = (await escrow.purchasePrice(home.id)) - (await escrow.escrowAmount(home.id));
      await signer.sendTransaction({ to: escrow.address, value: lendAmount.toString(), gasLimit: 100000 });
      setHasLended(true);
    } catch (error) {
      console.error('Error in lendHandler:', error);
    } finally {
      setIsLoading({ ...isLoading, lend: false });
    }
  };

  const sellHandler = async () => {
    setIsLoading({ ...isLoading, sell: true });
    try {
      const signer = await provider.getSigner();
      let transaction = await escrow.connect(signer).approveSale(home.id);
      await transaction.wait();
      transaction = await escrow.connect(signer).finalizeSale(home.id);
      await transaction.wait();
      setHasSold(true);
    } catch (error) {
      console.error('Error in sellHandler:', error);
    } finally {
      setIsLoading({ ...isLoading, sell: false });
    }
  };

  useEffect(() => {
    fetchDetails();
    fetchOwner();
  }, [hasBought, hasLended, hasInspected, hasSold]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      overflowY: 'auto', // Enable vertical scrolling
      padding: '20px', // Add padding for better mobile usability
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '24px',
        maxWidth: '900px',
        width: '90%',
        maxHeight: '90vh', // Limit height to 90% of viewport
        overflowY: 'auto', // Scrollable content
        position: 'relative',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
      }}>
        <div style={{ marginBottom: '16px' }}>
          <img src={home.image} alt="Home" style={{
            width: '100%',
            height: '256px',
            objectFit: 'cover',
            borderRadius: '8px',
            display: 'block', // Ensure no extra spacing
          }} />
        </div>
        <div style={{ padding: '16px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>{home.name}</h1>
          <p style={{ color: '#4B5563', marginBottom: '8px' }}>
            <strong>{home.attributes[2].value}</strong> bds |{' '}
            <strong>{home.attributes[3].value}</strong> ba |{' '}
            <strong>{home.attributes[4].value}</strong> sqft
          </p>
          <p style={{ color: '#4B5563', marginBottom: '16px' }}>{home.address}</p>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
            {home.attributes[0].value} ETH
          </h2>

          {owner ? (
            <div style={{ color: '#374151', marginTop: '16px' }}>
              Owned by {owner.slice(0, 6) + '...' + owner.slice(38, 42)}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
              {account === inspector ? (
                <button
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    color: '#fff',
                    fontWeight: '600',
                    backgroundColor: hasInspected ? '#10B981' : '#3B82F6',
                    cursor: hasInspected || isLoading.inspect ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    minWidth: '120px', // Ensure consistent button width
                  }}
                  onClick={inspectHandler}
                  disabled={hasInspected || isLoading.inspect}
                >
                  {isLoading.inspect ? (
                    <svg style={{
                      width: '20px',
                      height: '20px',
                      marginRight: '8px',
                      animation: 'spin 1s linear infinite',
                    }} viewBox="0 0 24 24">
                      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="#fff" strokeWidth="4" />
                      <path style={{ opacity: 0.75 }} fill="#fff" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : null}
                  {hasInspected ? 'Inspection Approved' : 'Approve Inspection'}
                </button>
              ) : account === lender ? (
                <button
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    color: '#fff',
                    fontWeight: '600',
                    backgroundColor: hasLended ? '#10B981' : '#3B82F6',
                    cursor: hasLended || isLoading.lend ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    minWidth: '120px',
                  }}
                  onClick={lendHandler}
                  disabled={hasLended || isLoading.lend}
                >
                  {isLoading.lend ? (
                    <svg style={{
                      width: '20px',
                      height: '20px',
                      marginRight: '8px',
                      animation: 'spin 1s linear infinite',
                    }} viewBox="0 0 24 24">
                      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="#fff" strokeWidth="4" />
                      <path style={{ opacity: 0.75 }} fill="#fff" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : null}
                  {hasLended ? 'Approved and Lended' : 'Approve & Lend'}
                </button>
              ) : account === seller ? (
                <button
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    color: '#fff',
                    fontWeight: '600',
                    backgroundColor: hasSold ? '#10B981' : '#3B82F6',
                    cursor: hasSold || isLoading.sell ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    minWidth: '120px',
                  }}
                  onClick={sellHandler}
                  disabled={hasSold || isLoading.sell}
                >
                  {isLoading.sell ? (
                    <svg style={{
                      width: '20px',
                      height: '20px',
                      marginRight: '8px',
                      animation: 'spin 1s linear infinite',
                    }} viewBox="0 0 24 24">
                      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="#fff" strokeWidth="4" />
                      <path style={{ opacity: 0.75 }} fill="#fff" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : null}
                  {hasSold ? 'Approved and Sold' : 'Approve & Sell'}
                </button>
              ) : (
                <button
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    color: '#fff',
                    fontWeight: '600',
                    backgroundColor: hasBought ? '#10B981' : '#3B82F6',
                    cursor: hasBought || isLoading.buy ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    minWidth: '120px',
                  }}
                  onClick={buyHandler}
                  disabled={hasBought || isLoading.buy}
                >
                  {isLoading.buy ? (
                    <svg style={{
                      width: '20px',
                      height: '20px',
                      marginRight: '8px',
                      animation: 'spin 1s linear infinite',
                    }} viewBox="0 0 24 24">
                      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="#fff" strokeWidth="4" />
                      <path style={{ opacity: 0.75 }} fill="#fff" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : null}
                  {hasBought ? 'Approvals pending' : 'Buy'}
                </button>
              )}
              <button style={{
                padding: '8px 16px',
                borderRadius: '4px',
                backgroundColor: '#D1D5DB',
                color: '#1F2937',
                fontWeight: '600',
                cursor: 'pointer',
                border: 'none',
                minWidth: '120px',
              }}>
                Contact agent
              </button>
            </div>
          )}

          <hr style={{ margin: '16px 0', borderColor: '#E5E7EB' }} />

          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Overview</h2>
          <p style={{ color: '#4B5563', marginBottom: '16px' }}>{home.description}</p>

          <hr style={{ margin: '16px 0', borderColor: '#E5E7EB' }} />

          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Facts and features</h2>
          <ul style={{ color: '#4B5563', listStyleType: 'none', padding: 0 }}>
            {home.attributes.map((attribute, index) => (
              <li key={index} style={{ marginBottom: '8px' }}>
                <strong>{attribute.trait_type}</strong>: {attribute.value}
              </li>
            ))}
          </ul>
        </div>
        <button onClick={togglePop} style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}>
          <img src={close} alt="Close" style={{ width: '24px', height: '24px' }} />
        </button>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 600px) {
          .home__details {
            width: 95%;
            padding: 16px;
          }
          .home__image img {
            height: 200px;
          }
          .home__overview h1 {
            font-size: 20px;
          }
          .home__overview h2 {
            font-size: 18px;
          }
          .home__buy, .home__contact {
            width: 100%;
            margin-bottom: 8px;
          }
        }
      `}</style>
    </div>
  );
};

export default Home;