import './css/app.css';
import Web3 from 'web3';
import Navbar from './NavBar';
import claimAbi from './abis/claimAbi.json';
import { ensure0x, dmdAddressToRipeResult, getPublicKeyFromSignature, getXYfromPublicKeyHex, signatureBase64ToRSV } from './utils';

function App() {

  const getClaimContract = async () => {
    let claimCAbi: any = claimAbi;

    const rpcUrl = 'https://rpc.uniq.diamonds';
    const claimContractAddress = '0xF7f552e953c1657af2604678829112e05Aa810e4';
    const web3 = new Web3(rpcUrl);

    const claimContract = new web3.eth.Contract(claimCAbi, claimContractAddress);
    return claimContract;
  }
 
  const checkBalance = async (claimContract: any, v3Address: string) => {
    const balance = await claimContract.methods.balances(v3Address).call();
    console.log("Balance", balance)
    if (parseInt(balance) > 0) {
      return true;
    } else {
      return false;
    }
  }

  const claimSubmit = async (e: any) => {
    e.preventDefault();
    const v3Address = e.target[0].value;
    const signedMessage = e.target[0].value;
    const v4Address = e.target[0].value;

    const claimContract = await getClaimContract();
    const ripe = dmdAddressToRipeResult(v3Address);
    const hasBalance = await checkBalance(claimContract, ensure0x(ripe));

    if(hasBalance) {
      const { publicKey, x, y } = getPublicKeyFromSignature(signedMessage, v4Address);

      console.log({
        publicKey, x, y
      })

      const { r, s , v } = signatureBase64ToRSV(signedMessage);

      console.log({
        r, s, v
      })
      
      // await claimContract.methods.claim(
      //   v3Address,
      //   v4Address,

      // ).send({
      //   from: ''
      // })
    }
  }

  return (
    <>
      <Navbar />
      <div className="App">
        <h1>Diamond Claim</h1>
        <form className='claimForm' onSubmit={claimSubmit}>
          <input placeholder='V3 Address' required minLength={34} maxLength={34}/>
          <input placeholder='V4 Address' required minLength={42} maxLength={42}/>
          <input placeholder='Signed Message' required/>
          <button>Claim</button>
        </form>
      </div>
    </>
  );
}

export default App;
