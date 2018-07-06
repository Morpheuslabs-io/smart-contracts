This repository contains MITx token sales smart contract and the audit report.

The sample smart contracts in the samples folder are used for references and learning purpose for those who may want to learn smart contract development.

# MITx-TokenSale

Opening time:
 
    startTimestamp = 1518453797; // 1518453797 converts to Tuesday February 13, 2018 00:43:17 (am) in time zone Asia/Singapore (+08)
    tier1Timestamp = 1519401599; //1519401599 converts to Friday February 23, 2018 23:59:59 (pm) in time zone Asia/Singapore (+08)
    tier2Timestamp = 1520611199 ; //1520611199 converts to Friday March 09, 2018 23:59:59 (pm) in time zone Asia/Singapore (+08)
    tier3Timestamp = 1521820799; // 1521820799 converts to Friday March 23, 2018 23:59:59 (pm) in time zone Asia/Singapore (+08)       
    endTimestamp = 1523807999;   // 1523807999 converts to Sunday April 15, 2018 23:59:59 (pm) in time zone Asia/Singapore (+08)

## Presale and Public Sale (fallback function)

* min purchase depends on the tiers ( till the tier1Tomestamp is 1 ether, other is 0,001 ether)
* max purchase is  1000000 ether;
* no pre-authorised 
é.( CS can switch ON/OFF the authorisation call the `switchONfreeForAll()` / `switchOFFfreeForAll()`)

## Private Sale (placeTokens)

* by CS user
* tokens minted on demand before or while sale is active.
* uses `placeTokens()` function

## Authorisation

* by CS user 
* can approve or block
* call `authoriseAccount()` / `authoriseManyAccounts()` / `blockAccount()`


##  Rate depends on the time
 1. 0% bonus , 1 Ether = 8000 MITx - CS can send the bonus by manually 
 2. 35% bonus , 1 Ether = 10800 MITx
 3. 20% bonus , 1 Ether = 9600 MITx
 4. 0% bonus , 1 Ether = 8000 MITx



## Finishing the sale (owner) - passes control of token back to the owner

* call `finishSale()` 

## Starting Trading

* call `startTrading()` on the TOKEN-contract


## Others

In addition, this repo also contains sample smart contracts that can be used for reference for smart contract development. We will add other smart contracts that we think worth to share.
