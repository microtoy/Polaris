import { ethers } from "ethers";

import { stringToHex } from "@/utils/helper";

const PROVIDER_RPC = "https://rpc.ankr.com/eth";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const GAS_PREMIUM = 120;

let lastNonce = 0;
let lastTimestamp = Date.now();
function generateNonce() {
  const currentTimestamp = Date.now();
  if (currentTimestamp !== lastTimestamp) {
    lastNonce = 0;
    lastTimestamp = currentTimestamp;
  }
  return `${currentTimestamp}${lastNonce++}`;
}

self.onmessage = async (e) => {
  const { index, privateKey, rpc, tick, amount, difficulty, gasPremium, env } =
    e.data;
  console.log("runIercMine", index);

  const provider = new ethers.providers.JsonRpcProvider(rpc ?? PROVIDER_RPC);
  const miner = new ethers.Wallet(privateKey, provider);
  const network = await provider.getNetwork();
  const { gasPrice } = await provider.getFeeData();
  const targetGasFee = gasPrice.div(100).mul(gasPremium || GAS_PREMIUM);

  let nonce = await miner.getTransactionCount();

  let startTime = Date.now();
  let mineCount = 0;
  let unique = 0;

  while (mineCount < 1) {
    mineCount += 1;
    if (mineCount % 10000 === 0) {
      const mineTime = (Date.now() - startTime) / 1000;
      const mineRate = Math.ceil(mineCount / mineTime);
      console.log(`🚀 ~ mineRate (${index}):`, mineRate);

      self.postMessage({
        mineRate,
      });
    }

    const callData = `data:application/json,{"p":"frc-20","op":"mint","tick":"${tick}","amt":"${amount}","nonce":"${generateNonce()}${unique++}"}`;

    const transaction = {
      type: 2,
      chainId: network.chainId,
      to: ZERO_ADDRESS,
      maxPriorityFeePerGas: targetGasFee,
      maxFeePerGas: targetGasFee,
      gasLimit: ethers.BigNumber.from("15000"),
      nonce: nonce,
      value: ethers.utils.parseEther("0"),
      data: stringToHex(callData),
    };
    

    const transaction2 = {
      type: 2,
      chainId: network.chainId,
      to: '0x828fA47D6b078f00a7728AB6bbA2a10832E14491',
      maxPriorityFeePerGas: targetGasFee,
      maxFeePerGas: targetGasFee,
      gasLimit: ethers.BigNumber.from("15000"),
      nonce: nonce,
      value: ethers.utils.parseEther("0"),
      data: '0x8de932220000000000000000000000001168b08e2070498b1d7d02e7b80d602d25e072e7000000000000000000000000000000000000000000000000000000000000000a',
    };
    const rawTransaction = ethers.utils.serializeTransaction(transaction);
    const transactionHash = ethers.utils.keccak256(rawTransaction);
    //console.log("🚀 ~ transaction:", transaction)

    const signingKey = miner._signingKey();
    const signature = signingKey.signDigest(transactionHash);
    // console.log("🚀 ~ signature:", signature)

    const recreatedSignature = ethers.utils.joinSignature(signature);
    // console.log("🚀 ~ recreatedSignature:", recreatedSignature)

    const predictedTransactionHash = ethers.utils.keccak256(
      ethers.utils.serializeTransaction(transaction, recreatedSignature),
    );

    if (predictedTransactionHash.includes(difficulty)) {
      unique = 0;

      self.postMessage({
        log: `🎉🎉🎉 Mine hash ${predictedTransactionHash}`,
      });

      if (env === "prod") {
        const realTransaction = await miner.sendTransaction(transaction);
        // console.log("🚀 ~ transaction:", transaction)
        // console.log("🚀 ~ realTransaction:", realTransaction)

        await realTransaction.wait();

        nonce = await miner.getTransactionCount();
      }
    }
  }
};
