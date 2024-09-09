import React, { useState } from 'react';

const ClaimForm2 = () => {
    const [theme, setTheme] = useState('light');
    const [copied, setCopied] = useState(false);

    const toggleDarkMode = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    };

    const copyText = () => {
        // const textarea = document.querySelector('.textarea-container textarea');
        // textarea.select();
        // document.execCommand('copy');
        // setCopied(true);
        // setTimeout(() => {
        //     setCopied(false);
        // }, 1000);
    };

    return (
        <div className={theme}>
            <div className="navbar">
                <a href="#">User Guide: <strong>How to claim <span className="diamond">💎</span></strong></a>
                <div className="btnsContainer">
                    <button onClick={toggleDarkMode} className="primaryBtn theme">
                        <i id="themeIcon" className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-cloud-moon'}`}></i>
                    </button>
                    <button className="primaryBtn">Connect Wallet</button>
                </div>
            </div>

            <div className="form-container">
                <div className="step-indicator">
                    <div className="step active"></div>
                    <div className="step"></div>
                    <div className="step"></div>
                    <div className="step"></div>
                </div>
                <div className="form-content">
                    <h1>Claim your V4 DMD Coins</h1>
                    <form>
                        <input type="text" placeholder="Please specify your V3 Address" />

                        <p>You can claim: <strong>50 DMD</strong></p>

                        <input type="text" placeholder="Please specify your V4 Address" />

                        <p className="text-error">Sorry, your v4 address is invalid, please copy the address from Metamask or other key's manager.</p>

                        <div className="textarea-container">
                            <textarea disabled>I want to claim my DMD Diamond V4 coins for the Testnet to the following address: 0xC969dc0b07acE3e99d6C2636e26D80086a90b847</textarea>
                            <button type="button" onClick={copyText}>
                                <i className="fas fa-copy"></i>
                                <span className="tooltip" style={{ visibility: copied ? 'visible' : 'hidden', opacity: copied ? '1' : '0' }}>Copied!</span>
                            </button>
                        </div>

                        <input type="text" placeholder="Please provide the signature you've generated" />

                        <p className="text-error">Sorry, the signature provided doesn't meet the requirements, please check the user manual if you've done the steps in a correct way.</p>

                        <button className="primaryBtn" type="submit">
                            <span className="diamond">💎</span>
                            Claim
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ClaimForm2;
