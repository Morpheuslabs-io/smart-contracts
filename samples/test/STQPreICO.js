'use strict';

import {crowdsaleUTest} from './utest/Crowdsale';

const STQPreICO = artifacts.require("./test_helpers/STQPreICOTestHelper.sol");
const STQToken = artifacts.require("./STQToken.sol");


contract('STQPreICO', function(accounts) {

    async function instantiate(role) {
        const token = await STQToken.new([role.owner1, role.owner2, role.owner3], {from: role.nobody});
        const preICO = await STQPreICO.new(token.address, role.owner3, {from: role.nobody});
        await preICO.transferOwnership(role.owner1, {from: role.nobody});

        await token.setController(preICO.address, {from: role.owner1});
        await token.setController(preICO.address, {from: role.owner2});

        return [preICO, token, role.owner3];
    }


    for (const [name, fn] of crowdsaleUTest(accounts, instantiate, {
        extraPaymentFunction: 'buy',
        rate: 100000,
        hardCap: web3.toWei(400, 'finney'),
        startTime: (new Date('Thu, 12 Oct 2017 0:00:00 GMT')).getTime() / 1000,
        endTime: (new Date('Fri, 13 Oct 2017 0:00:00 GMT')).getTime() / 1000,
        maxTimeBonus: 40,
        firstPostICOTxFinishesSale: true,
        postICOTxThrows: false,
        hasAnalytics: true,
        analyticsPaymentBonus: 2
    }))
        it(name, fn);
});
