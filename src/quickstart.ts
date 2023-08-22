// Foxify repo : https://github.com/foxify-trade/options-sdk
// Current version : v1.2
// Foxify swagger : 

// To run this demo : 
// 1. Create a .env file with your private key: PK='your_private_key'
// 2. yarn ts-node quickstart.ts

// IMPORTANT NOTES  :
// Code of the sdk in : node_modules/@foxify.trade/options-sdk/dist/
// important functions are in : 
// options-sdk/dist/contracts/Core/web3.d.ts
// options-sdk/dist/api/api.module.d.ts

import assert from 'assert';
import { OptionsSdk } from '@foxify.trade/options-sdk';
require('dotenv').config();

assert(process.env.PK, 'Set PK in .env');

// This 'sdk' variable is not understood when property 'priceFeed' is included.
// 'const sdk' has to be removed.
/*
const sdk = new OptionsSdk({
  api: {
    url: 'https://api-options.prd.foxify.trade',
  },
  contracts: {
    rpc: 'https://arbitrum-one.publicnode.com',
    privateKey: process.env.PK,
    address: {
      core: '0xec301D5a4ee80DF21E243E5490d29d44B83c27fC',
      stable: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    },
    gasRiskFactor: {
      price: 10n,
      limit: 10n,
    }   
  },
    priceFeed: {
       url: 'https://xc-mainnet.pyth.network',
  }
})

*/
// 'sdk' without 'priceFeed' that works
const sdk = new OptionsSdk({
  contracts: {
    privateKey: process.env.PK,
  },
})


async function main() {

  const [oracle] = await sdk.api.getOracles();

  // Define the binary option :
  const direction = sdk.contracts.Direction.Up;
  const duration = '15m';
  const percent = 3.0; // For now, must be an int, remove this limitation
  const rate = 1.11
  const amount = 12; // For now, must be an int, remove this limitation

  let doGetOrders = true;
  let doCreateOrder = false;
  let doIncreaseOrder = false; // Ok but does not display on the GUI for 0.5% (it does for 1%)
  let doDecreaseOrder = true; // not ok
  let doCancelOrder = true;
  let doGetPriceFeed = false; // ok

  if (doGetPriceFeed) {
    const [oracle] = await sdk.api.getOracles();

    console.log(`Oracle pyth id for ${oracle.name} (address=${oracle.address})`)
    const latest = await sdk.priceFeed.getLatestPrice(oracle.address);
    console.log('Latest Price Feeds', latest);
    sdk.priceFeed.subscribePriceUpdates(oracle.address, (price) => {
      console.log(`[${new Date().toISOString()}] New price feed received`, price);
    })
  }

  // Example of oracle structure :
  /*
     {
     "id": 20734,
     "createdAt": "2023-07-11T19:06:38.019Z",
     "updatedAt": "2023-07-11T19:06:38.019Z",
     "chainId": 42161,
     "name": "BTC/USD",
     "address": "0x0015d0ab0e5ac1f31f8c40fcf9844797feeb1b09",
     "priceId": "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
     "decimals": "18"
     }
   */
  console.log(`Available oracle: ${JSON.stringify(oracle, null, 2)}`);
  console.log(`Working on asset : ${oracle.name}`);

  // let globalOrderId = 581; // Either a hard-coded number, or leave it to null if we create an order and increase/decrease/cancel on this specific order 
  let globalOrderId = 679; // Either a hard-coded number, or leave it to null if we create an order and increase/decrease/cancel on this specific order 

if (doGetOrders) {
// Type IGetOrderParams :
  const orderParams = {
    account: sdk.contracts.sender,
    closed: true,
    // orderType: 'my_order' | 'all_order',
    orderType: 'all_order' as const,
    limit: 20 
}

   const [order] = await sdk.api.getOrders(orderParams);
   const myOrderCount = await sdk.contracts.core.methods.creatorOrdersCount(sdk.contracts.sender).call();

   console.log(`myOrderCount : ${myOrderCount}`);
   console.log(`sender address: ${sdk.contracts.sender}`);
   console.log (`orders : ${JSON.stringify(order,null,2)}`);
}

  if (doCreateOrder) {
    const { orderId } = await sdk.contracts.createOrder({
      direction: direction,
      duration: duration,
      oracle: oracle.address,
      percent: percent,
      rate: rate,
      amount: amount,
      reinvest: false
    });

    console.log(`orderId was created : orderId: #${orderId}\nDirection:${direction}\nDuration:${duration}\npercent:${percent}\nRate:${rate}\nAmount:${amount}`);
    globalOrderId = orderId;
  }

  if (doIncreaseOrder) {
    const orderId = globalOrderId;
    const diffAmount = 1;
    await sdk.contracts.increaseOrderAmount(orderId, diffAmount);
    console.log(`orderId ${orderId} was increased by ${diffAmount} USDC`);
  }

  if (doDecreaseOrder) {
    const orderId = globalOrderId;
    const diffAmount = 10;

    await sdk.contracts.decreaseOrderAmount(orderId, diffAmount);
    console.log(`orderId #${orderId} was decreased by ${diffAmount} USDC`);
  }

  if (doCancelOrder) {
    const orderId = globalOrderId;
    await sdk.contracts.closeOrder(orderId);
    console.log(`orderId #${orderId} was cancelled !`);
  }

/*
  if (doGetOrders) {
    console.log(`Trying to get myOrders...`);

    // get orders that u have created
    const myOrders = await sdk.api.getOrders({
      account: sdk.contracts.sender,
      orderType: 'my_order',
      skip: 0,
      limit: 10,
    });

    console.log(`myOrders : ${JSON.stringify(myOrders, null, 2)}`);
  }
*/

}

main();
