import './css/navbar.css';
import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from './redux/hooks';
import { setActiveAccount } from './redux/slices/accountsSlice';


const Navbar = () => {
    const dispatch = useAppDispatch();
    const account = useAppSelector((state) => state.accountsReducer.account);

    useEffect(() => {
        connectWallet();

        // handle account change
        window.ethereum.on('accountsChanged', function (accounts: string[]) {
            dispatch(setActiveAccount(accounts[0]));
        })
    }, [])

    async function connectWallet(): Promise<void> {
        window.ethereum
            .request({
                method: "eth_requestAccounts",
            })
            .then((accounts: string[]) => {
                dispatch(setActiveAccount(accounts[0]))
            })
            .catch((error: any) => {
                alert(`Metamask: ${error.message}`);
            });
    }

    return (
        <div className='navbar'>
            <button className='navConnectBtn' onClick={connectWallet}>
                {account ? account : 'Connect Wallet'}
            </button>
        </div>
    );
}

export default Navbar;