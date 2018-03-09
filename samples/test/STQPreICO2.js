'use strict';

import {crowdsaleUTest} from './utest/Crowdsale';

const STQPreICO2 = artifacts.require("./test_helpers/STQPreICO2TestHelper.sol");
const STQToken = artifacts.require("./STQToken.sol");
const FundsRegistry = artifacts.require("./crowdsale/FundsRegistry.sol");


contract('STQPreICO2', function(accounts) {

    async function instantiate(role) {
        const token = await STQToken.new([role.owner1, role.owner2, role.owner3], {from: role.nobody});
        const preICO = await STQPreICO2.new(token.address, [role.owner1, role.owner2, role.owner3], {from: role.nobody});
        await preICO.transferOwnership(role.owner1, {from: role.nobody});

        await token.setController(preICO.address, {from: role.owner1});
        await token.setController(preICO.address, {from: role.owner2});

        return [preICO, token, FundsRegistry.at(await preICO.m_fundsAddress())];
    }


    for (const [name, fn] of crowdsaleUTest(accounts, instantiate, {
        usingFund: true,
        preCollectedFunds: web3.toWei(9, 'finney'),
        extraPaymentFunction: 'buy',
        rate: 100000,
        softCap: web3.toWei(100, 'finney'),
        hardCap: web3.toWei(400, 'finney'),
        startTime: (new Date('Wed, 18 Oct 2017 17:00:00 GMT')).getTime() / 1000,
        endTime: (new Date('Thu, 23 Oct 2017 17:00:00 GMT')).getTime() / 1000,
        maxTimeBonus: 35,
        firstPostICOTxFinishesSale: true,
        postICOTxThrows: false,
        hasAnalytics: true,
        analyticsPaymentBonus: 2
    }))
        it(name, fn);
});
