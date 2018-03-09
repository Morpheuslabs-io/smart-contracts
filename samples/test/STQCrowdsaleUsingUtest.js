'use strict';

import {crowdsaleUTest} from './utest/Crowdsale';
import {instantiateCrowdsale} from './helpers/storiqa';


contract('STQCrowdsale (using utest)', function(accounts) {

    for (const [name, fn] of crowdsaleUTest(accounts, instantiateCrowdsale, {
        usingFund: true,
        preCollectedFunds: web3.toWei(2, 'finney'),
        extraPaymentFunction: 'buy',
        rate: 100000,
        softCap: web3.toWei(100, 'finney'),
        hardCap: web3.toWei(400, 'finney'),
        startTime: (new Date('Wed, 25 Oct 2017 0:00:00 GMT')).getTime() / 1000,
        endTime: (new Date('Tue, 26 Dec 2017 0:00:00 GMT')).getTime() / 1000,
        maxTimeBonus: 30,
        firstPostICOTxFinishesSale: true,
        postICOTxThrows: true,
        hasAnalytics: true,
        analyticsPaymentBonus: 2,
        onSuccessfulSaleCallback: async function(role, crowdsale, token, funds) {
            await crowdsale.distributeBonuses(10, {from: role.nobody});
        },
        extraTokensPercent: 40
    }))
        it(name, fn);
});
