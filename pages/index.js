import React from "react"
import { useRouter } from 'next/router'
import { ethers } from "ethers"
import Web3Modal from "web3modal"
import { WHITELIST_CONTRACT_ADDRESS, abi } from "../constants"

import home from "../styles/Home.module.css"

export async function getServerSideProps() {
    const passiveProvider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_API_KEY_URL)
    const whiteListContract = new ethers.Contract(WHITELIST_CONTRACT_ADDRESS, abi, passiveProvider)
    const numAddressesWhitelisted = await whiteListContract.numAddressesWhitelisted()
    return { props: { numAddressesWhitelisted } }
}


export default function Home({ numAddressesWhitelisted }) {
    const [addressState, setAddressState] = React.useState(new Set(["welcome"]))
    const web3ModalRef = React.useRef()

    const router = useRouter();

    // https://www.joshwcomeau.com/nextjs/refreshing-server-side-props/
    const refreshData = () => {
        router.replace(router.asPath);
    }

    async function connectWallet(needSigner = false) {
        const instance = await web3ModalRef.current.connect()
        const provider = new ethers.providers.Web3Provider(instance)
        if (needSigner) {
            const signer = provider.getSigner()
            return signer
        }
        return provider
    }

    async function whitelistMyAddress() {
        try {
            const mySigner = await connectWallet(true)
            const whiteListContract = new ethers.Contract(WHITELIST_CONTRACT_ADDRESS, abi, mySigner)
            const isSigned = await whiteListContract.whitelistedAddresses(mySigner.getAddress())
            if (isSigned) {
                setAddressState(prevState => {
                    let newState = new Set(prevState)
                    newState.add("alreadyWhitelisted")
                    return newState
                })
            } else {
                const tx = await whiteListContract.whitelistMyAddress()
                setAddressState(prevState => {
                    let newState = new Set(prevState)
                    newState.add("loading")
                    return newState
                })
                await tx.wait()
                setAddressState(prevState => {
                    let newState = new Set(prevState)
                    newState.add("whitelisted")
                    newState.delete("loading")
                    return newState
                })
                refreshData()
            }

        } catch (err) {
            console.log(err)
        }


    }

    function renderButton() {
        let text = "Connect Wallet"

        if (addressState.has("whitelisted")) {
            text = "Congrats ! You're whitelisted !"
        } else if (addressState.has("alreadyWhitelisted")) {
            text = "You're already whitelisted !"
        } else if (addressState.has("loading")) {
            text = "loading ..."
        }
        return (
            <button className={home.button} onClick={whitelistMyAddress}>{text}</button>
        )
    }

    React.useEffect(() => {
        // Web3Modal needs the "window" object is created on the client side
        // putting this in useEffect forces a client side rendering (CSR)
        // and "window" is created
        // -- not needed with React (working on client side) but needed with Next.js
        web3ModalRef.current = new Web3Modal({
            network: "rinkeby",
            providerOptions: {},
            disableInjectedProvider: false,
        })

    }, [])



    return (
        <div className={home.homeContainer}>
            <div className={home.main}>
                <div className={home.textContainer}>
                    <h1 className={home.h1}>Welcome to Crypto Devs !</h1>
                    <div className={home.welcomeText}>it&apos;s an NFT collection for developers in Crypto.</div>
                    <div className={home.welcomeText}>{numAddressesWhitelisted} have already joined the Whitelist</div>
                    {renderButton()}
                </div>
                <img className={home.imgCryptoDevs} alt="crypto-devs.svg" src="./crypto-devs.svg" />
            </div>
        </div>

    )
}