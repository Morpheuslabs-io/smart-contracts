'use strict';

// testrpc has to be run as testrpc -u 0 -u 1 -u 2 -u 3 -u 4 -u 5 -u 6

import './helpers/typeExt';
import expectThrow from './helpers/expectThrow';
import {l, logEvents} from './helpers/debug';
import {instantiateCrowdsale} from './helpers/storiqa';

const STQCrowdsale = artifacts.require("../test_helpers/STQCrowdsaleTestHelper.sol");


// Note: build artifact does not get rebuilt as STQCrowdsale changes (by some reason)
contract('STQCrowdsale', function(accounts) {

    function getRoles() {
        return {
            owner3: accounts[0],
            owner1: accounts[1],
            owner2: accounts[2],
            investor1: accounts[2],
            investor2: accounts[3],
            investor3: accounts[4],
            deployer: accounts[5],
            nobody: accounts[6]
        };
    }

    async function instantiate(args=undefined) {
        return instantiateCrowdsale(getRoles(), args);
    }

    function assertBigNumberEqual(actual, expected, message=undefined) {
        assert(actual.eq(expected), "{2}expected {0}, but got: {1}".format(expected, actual,
            message ? message + ': ' : ''));
    }

    async function assertBalances(crowdsale, token, funds, expected) {
        assert.equal(await web3.eth.getBalance(crowdsale.address), 0);
        assert.equal(await web3.eth.getBalance(token.address), 0);
        assert.equal(await web3.eth.getBalance(funds.address), expected);
    }

    // converts amount of STQ into STQ-wei
    function STQ(amount) {
        return web3.toWei(amount, 'ether');
    }

    async function checkNotSendingEther(crowdsale, token, funds) {
        const role = getRoles();

        await expectThrow(funds.sendEther(role.nobody, web3.toWei(20, 'finney'), {from: role.nobody}));
        await expectThrow(funds.sendEther(role.investor3, web3.toWei(20, 'finney'), {from: role.investor3}));

        await funds.sendEther(role.owner1, web3.toWei(20, 'finney'), {from: role.owner1});
        await expectThrow(funds.sendEther(role.owner1, web3.toWei(20, 'finney'), {from: role.owner2}));
    }

    async function checkNotWithdrawing(crowdsale, token, funds) {
        const role = getRoles();

        for (const from_ of [role.nobody, role.owner1, role.investor1, role.investor2, role.investor3])
            await expectThrow(funds.withdrawPayments({from: from_}));
    }

    async function checkNotInvesting(crowdsale, token, funds) {
        const role = getRoles();

        for (const from_ of [role.nobody, role.owner1, role.investor1, role.investor2, role.investor3])
            await expectThrow(crowdsale.sendTransaction({from: from_, value: web3.toWei(20, 'finney')}));
    }

    async function checkNoTransfers(crowdsale, token, funds) {
        const role = getRoles();

        await expectThrow(token.transfer(role.nobody, STQ(2.5), {from: role.nobody}));
        await expectThrow(token.transfer(role.investor3, STQ(2.5), {from: role.nobody}));
        await expectThrow(token.transfer(role.investor3, STQ(2.5), {from: role.investor2}));
    }


    it("test instantiation", async function() {
        const role = getRoles();

        const [crowdsale, token, funds] = await instantiate();

        assert.equal(await token.m_controller(), crowdsale.address);
        assert.equal(await funds.m_controller(), crowdsale.address);

        await assertBalances(crowdsale, token, funds, 0);
    });


    it("test investments", async function() {
        const role = getRoles();

        const [crowdsale, token, funds] = await instantiate();

        // too early!
        await crowdsale.setTime(1505531600, {from: role.owner1});
        await expectThrow(crowdsale.sendTransaction({from: role.investor3, value: web3.toWei(20, 'finney')}));
        await crowdsale.setTime(1508889599, {from: role.owner1});
        await expectThrow(crowdsale.sendTransaction({from: role.investor3, value: web3.toWei(20, 'finney')}));

        // first investment at the first second, +30%
        await crowdsale.setTime(1508889600, {from: role.owner1});
        await crowdsale.sendTransaction({from: role.investor1, value: web3.toWei(20, 'finney')});
        await assertBalances(crowdsale, token, funds, web3.toWei(20, 'finney'));
        // remember: this is STQ balance
        assertBigNumberEqual(await token.balanceOf(role.investor1), STQ(2600));
        await expectThrow(crowdsale.sendTransaction({from: role.nobody, value: web3.toWei(0, 'finney')}));
        assert.equal(await token.balanceOf(role.nobody), STQ(0));

        // cant invest into other contracts
        await expectThrow(token.sendTransaction({from: role.investor1, value: web3.toWei(20, 'finney')}));
        await expectThrow(funds.sendTransaction({from: role.investor1, value: web3.toWei(20, 'finney')}));

        // +5%
        await crowdsale.setTime(1511913601, {from: role.owner1});
        await crowdsale.sendTransaction({from: role.investor2, value: web3.toWei(100, 'finney')});
        await assertBalances(crowdsale, token, funds, web3.toWei(120, 'finney'));
        assertBigNumberEqual(await token.balanceOf(role.investor1), STQ(2600));
        assertBigNumberEqual(await token.balanceOf(role.investor2), STQ(10500));

        // 2nd investment of investor1
        await crowdsale.sendTransaction({from: role.investor1, value: web3.toWei(20, 'finney')});
        await assertBalances(crowdsale, token, funds, web3.toWei(140, 'finney'));
        assertBigNumberEqual(await token.balanceOf(role.investor1), STQ(4700));
        assertBigNumberEqual(await token.balanceOf(role.investor2), STQ(10500));

        // +0%
        await crowdsale.setTime(1513728001, {from: role.owner1});
        await crowdsale.sendTransaction({from: role.investor3, value: web3.toWei(40, 'finney')});
        await assertBalances(crowdsale, token, funds, web3.toWei(180, 'finney'));
        assertBigNumberEqual(await token.balanceOf(role.investor1), STQ(4700));
        assertBigNumberEqual(await token.balanceOf(role.investor2), STQ(10500));
        assertBigNumberEqual(await token.balanceOf(role.investor3), STQ(4000));
        await expectThrow(crowdsale.sendTransaction({from: role.nobody, value: web3.toWei(0, 'finney')}));

        await checkNoTransfers(crowdsale, token, funds);
        await checkNotWithdrawing(crowdsale, token, funds);
        await checkNotSendingEther(crowdsale, token, funds);

        // too late
        await crowdsale.setTime(1514246400, {from: role.owner1});
        // this tx will implicitly finish ICO
        await crowdsale.sendTransaction({from: role.investor2, value: web3.toWei(20, 'finney')});
        assertBigNumberEqual(await token.balanceOf(role.investor2), STQ(10500));
        await expectThrow(crowdsale.sendTransaction({from: role.nobody, value: web3.toWei(20, 'finney')}));
        assert.equal(await token.balanceOf(role.nobody), STQ(0));

        await assertBalances(crowdsale, token, funds, web3.toWei(180, 'finney'));
        assertBigNumberEqual(await token.balanceOf(role.investor1), STQ(4700));
        assertBigNumberEqual(await token.balanceOf(role.investor2), STQ(10500));
        assertBigNumberEqual(await token.balanceOf(role.investor3), STQ(4000));
        assertBigNumberEqual(await token.totalSupply(), STQ(19200));

        assert.equal(await crowdsale.m_state(), 4);     // now we are in DISTRIBUTING_BONUSES

        await checkNoTransfers(crowdsale, token, funds);
        await checkNotInvesting(crowdsale, token, funds);
        await checkNotWithdrawing(crowdsale, token, funds);
        await checkNotSendingEther(crowdsale, token, funds);

        assert.equal(await funds.getInvestorsCount(), 3);
        assert.equal(await funds.m_investors(0), role.investor1);
        assert.equal(await funds.m_investors(1), role.investor2);
        assert.equal(await funds.m_investors(2), role.investor3);

        await crowdsale.distributeBonuses(10, {from: role.nobody});

        await assertBalances(crowdsale, token, funds, web3.toWei(180, 'finney'));
        assertBigNumberEqual(await token.balanceOf(role.investor1), STQ(5200));
        assertBigNumberEqual(await token.balanceOf(role.investor2), STQ(13000));
        assertBigNumberEqual(await token.balanceOf(role.investor3), STQ(5200));
        assertBigNumberEqual(await token.balanceOf(role.owner1), STQ(15600));   // team
        assertBigNumberEqual(await token.totalSupply(), STQ(39000));

        assert.equal(await crowdsale.m_state(), 5);     // now we are in SUCCEEDED
        await checkNotInvesting(crowdsale, token, funds);
        await checkNotWithdrawing(crowdsale, token, funds);
    });


   it("test min cap", async function() {
        const role = getRoles();

        const [crowdsale, token, funds] = await instantiate();

        await crowdsale.setTime(1508889600, {from: role.owner1});
        await crowdsale.sendTransaction({from: role.investor1, value: web3.toWei(20, 'finney')});
        await crowdsale.sendTransaction({from: role.investor2, value: web3.toWei(60, 'finney')});
        await assertBalances(crowdsale, token, funds, web3.toWei(80, 'finney'));

        await crowdsale.setTime(1514246400, {from: role.owner1});
        await crowdsale.checkTime({from: role.owner1});

        assert.equal(await crowdsale.m_state(), 3);

        await expectThrow(funds.withdrawPayments({from: role.investor3}));
        await expectThrow(funds.withdrawPayments({from: role.owner3}));
        await funds.withdrawPayments({from: role.investor2});
        await assertBalances(crowdsale, token, funds, web3.toWei(20, 'finney'));

        await expectThrow(funds.withdrawPayments({from: role.nobody}));

        await checkNoTransfers(crowdsale, token, funds);
        await checkNotInvesting(crowdsale, token, funds);
        await checkNotSendingEther(crowdsale, token, funds);

        await funds.withdrawPayments({from: role.investor1});
        await assertBalances(crowdsale, token, funds, web3.toWei(0, 'finney'));
    });


    it("test max cap", async function() {
        const role = getRoles();

        const [crowdsale, token, funds] = await instantiate();

        // +5%
        await crowdsale.setTime(1511913601, {from: role.owner1});
        await crowdsale.sendTransaction({from: role.investor1, value: web3.toWei(20, 'finney')});
        await assertBalances(crowdsale, token, funds, web3.toWei(20, 'finney'));

        const investor3initial = await web3.eth.getBalance(role.investor3);
        await crowdsale.sendTransaction({from: role.investor3, value: web3.toWei(1000, 'finney'), gasPrice: 0});

        const investor3spent = investor3initial.sub(await web3.eth.getBalance(role.investor3));
        assertBigNumberEqual(investor3spent, web3.toWei(378, 'finney'), 'change has to be sent');

        assert.equal(await crowdsale.m_state(), 4);
        await assertBalances(crowdsale, token, funds, web3.toWei(398, 'finney'));
        assertBigNumberEqual(await token.balanceOf(role.investor1), STQ(2100));
        assertBigNumberEqual(await token.balanceOf(role.investor3), STQ(39690));

        await checkNoTransfers(crowdsale, token, funds);
        await checkNotInvesting(crowdsale, token, funds);
        await checkNotWithdrawing(crowdsale, token, funds);
        await checkNotSendingEther(crowdsale, token, funds);

        await crowdsale.distributeBonuses(10, {from: role.nobody});

        assertBigNumberEqual(await token.balanceOf(role.investor1), STQ(2600));
        assertBigNumberEqual(await token.balanceOf(role.investor3), STQ(49140));

        await checkNotInvesting(crowdsale, token, funds);
        await checkNotWithdrawing(crowdsale, token, funds);
    });


    it("test minting for the team", async function() {
        const role = getRoles();

        let [crowdsale, token, funds] = await instantiate();

        await crowdsale.setTime(1508889600, {from: role.owner1});
        await crowdsale.sendTransaction({from: role.investor1, value: web3.toWei(20, 'finney')});
        await crowdsale.sendTransaction({from: role.investor2, value: web3.toWei(100, 'finney')});
        await assertBalances(crowdsale, token, funds, web3.toWei(120, 'finney'));

        await crowdsale.setTime(1514246400, {from: role.owner1});
        await crowdsale.checkTime({from: role.owner1});
        await crowdsale.distributeBonuses(10, {from: role.nobody});

        assertBigNumberEqual(await token.balanceOf(role.investor1), STQ(2600));
        assertBigNumberEqual(await token.balanceOf(role.investor2), STQ(13000));
        assertBigNumberEqual(await token.balanceOf(role.owner1), STQ(10400));
        assertBigNumberEqual(await token.totalSupply(), STQ(26000));
        await assertBalances(crowdsale, token, funds, web3.toWei(120, 'finney'));

        // now, with owner-and-investor person

        [crowdsale, token, funds] = await instantiate();

        await crowdsale.setTime(1508889600, {from: role.owner1});
        await crowdsale.sendTransaction({from: role.owner1, value: web3.toWei(20, 'finney')});
        await crowdsale.sendTransaction({from: role.investor2, value: web3.toWei(100, 'finney')});
        await assertBalances(crowdsale, token, funds, web3.toWei(120, 'finney'));

        await crowdsale.setTime(1514246400, {from: role.owner1});
        await crowdsale.checkTime({from: role.owner1});
        await crowdsale.distributeBonuses(10, {from: role.nobody});

        assertBigNumberEqual(await token.balanceOf(role.owner1), STQ(13000));
        assertBigNumberEqual(await token.balanceOf(role.investor2), STQ(13000));
        assertBigNumberEqual(await token.totalSupply(), STQ(26000));
        await assertBalances(crowdsale, token, funds, web3.toWei(120, 'finney'));
    });


    it("test transfers", async function() {
        const role = getRoles();

        const [crowdsale, token, funds] = await instantiate();

        await crowdsale.setTime(1508889600, {from: role.owner1});
        await crowdsale.sendTransaction({from: role.investor1, value: web3.toWei(20, 'finney')});
        await crowdsale.sendTransaction({from: role.investor2, value: web3.toWei(100, 'finney')});
        await assertBalances(crowdsale, token, funds, web3.toWei(120, 'finney'));

        await checkNoTransfers(crowdsale, token, funds);

        // finish
        await crowdsale.setTime(1514246400, {from: role.owner1});
        await crowdsale.checkTime({from: role.owner1});
        await crowdsale.distributeBonuses(10, {from: role.nobody});

        await expectThrow(token.transfer(role.nobody, STQ(2.5), {from: role.nobody}));
        await expectThrow(token.transfer(role.investor3, STQ(2.5), {from: role.nobody}));

        await token.transfer(role.investor3, STQ(1000), {from: role.investor2});
        await assertBalances(crowdsale, token, funds, web3.toWei(120, 'finney'));
        assertBigNumberEqual(await token.balanceOf(role.investor1), STQ(2600));
        assertBigNumberEqual(await token.balanceOf(role.investor2), STQ(12000));
        assertBigNumberEqual(await token.balanceOf(role.investor3), STQ(1000));
        assertBigNumberEqual(await token.totalSupply(), STQ(26000));

        await checkNotInvesting(crowdsale, token, funds);
        await checkNotWithdrawing(crowdsale, token, funds);
    });


    it("test pause", async function() {
        const role = getRoles();

        const [crowdsale, token, funds] = await instantiate();

        await crowdsale.setTime(1508889600, {from: role.owner1});
        await crowdsale.sendTransaction({from: role.investor1, value: web3.toWei(20, 'finney')});
        await crowdsale.sendTransaction({from: role.investor2, value: web3.toWei(100, 'finney')});
        await assertBalances(crowdsale, token, funds, web3.toWei(120, 'finney'));

        // pause
        await expectThrow(crowdsale.pause({from: role.nobody}));
        await expectThrow(crowdsale.pause({from: role.investor3}));
        await crowdsale.pause({from: role.owner3});
        assert.equal(await crowdsale.m_state(), 2);

        await checkNoTransfers(crowdsale, token, funds);
        await checkNotInvesting(crowdsale, token, funds);
        await checkNotWithdrawing(crowdsale, token, funds);
        await checkNotSendingEther(crowdsale, token, funds);

        // continue
        await crowdsale.unpause({from: role.owner1});
        assert.equal(await crowdsale.m_state(), 2);
        await crowdsale.unpause({from: role.owner3});
        assert.equal(await crowdsale.m_state(), 1);

        await crowdsale.sendTransaction({from: role.investor3, value: web3.toWei(20, 'finney')});
        await assertBalances(crowdsale, token, funds, web3.toWei(140, 'finney'));
        assertBigNumberEqual(await token.balanceOf(role.investor3), STQ(2600));

        await checkNoTransfers(crowdsale, token, funds);
        await checkNotWithdrawing(crowdsale, token, funds);
        await checkNotSendingEther(crowdsale, token, funds);

        // finish
        await crowdsale.setTime(1514246400, {from: role.owner1});
        await crowdsale.checkTime({from: role.owner1});
        await crowdsale.distributeBonuses(10, {from: role.nobody});
        assert.equal(await crowdsale.m_state(), 5);
        await assertBalances(crowdsale, token, funds, web3.toWei(140, 'finney'));
    });


    it("test fail from pause", async function() {
        const role = getRoles();

        const [crowdsale, token, funds] = await instantiate();

        await crowdsale.setTime(1508889600, {from: role.owner1});
        await crowdsale.sendTransaction({from: role.investor1, value: web3.toWei(20, 'finney')});
        await crowdsale.sendTransaction({from: role.investor2, value: web3.toWei(100, 'finney')});
        await assertBalances(crowdsale, token, funds, web3.toWei(120, 'finney'));

        await crowdsale.pause({from: role.owner3});

        // fail
        await crowdsale.fail({from: role.owner1});
        assert.equal(await crowdsale.m_state(), 2);
        await crowdsale.fail({from: role.owner3});
        assert.equal(await crowdsale.m_state(), 3);

        await checkNoTransfers(crowdsale, token, funds);
        await checkNotInvesting(crowdsale, token, funds);
        await checkNotSendingEther(crowdsale, token, funds);
    });


    it("test sending ether", async function() {
        const role = getRoles();

        const [crowdsale, token, funds] = await instantiate();

        await crowdsale.setTime(1508889600, {from: role.owner1});
        await crowdsale.sendTransaction({from: role.investor3, value: web3.toWei(20, 'finney')});
        await crowdsale.sendTransaction({from: role.investor2, value: web3.toWei(100, 'finney')});
        await assertBalances(crowdsale, token, funds, web3.toWei(120, 'finney'));

        await checkNoTransfers(crowdsale, token, funds);
        await checkNotWithdrawing(crowdsale, token, funds);
        await checkNotSendingEther(crowdsale, token, funds);

        // finish
        await crowdsale.setTime(1514246400, {from: role.owner1});
        await crowdsale.checkTime({from: role.owner1});
        await crowdsale.distributeBonuses(10, {from: role.nobody});

        await checkNotInvesting(crowdsale, token, funds);
        await checkNotWithdrawing(crowdsale, token, funds);

        let initial = await web3.eth.getBalance(role.owner1);
        await funds.sendEther(role.owner1, web3.toWei(40, 'finney'), {from: role.owner2});
        await funds.sendEther(role.owner1, web3.toWei(40, 'finney'), {from: role.owner3});
        let added = (await web3.eth.getBalance(role.owner1)).sub(initial);
        assert.equal(added, web3.toWei(40, 'finney'));

        initial = await web3.eth.getBalance(role.owner2);
        await funds.sendEther(role.owner2, web3.toWei(10, 'finney'), {from: role.owner1});
        await funds.sendEther(role.owner2, web3.toWei(10, 'finney'), {from: role.owner3});
        added = (await web3.eth.getBalance(role.owner2)).sub(initial);
        assert.equal(added, web3.toWei(10, 'finney'));

        await checkNotInvesting(crowdsale, token, funds);
        await checkNotWithdrawing(crowdsale, token, funds);
    });


    it("test auto-pause", async function() {
        const role = getRoles();

        const [crowdsale, token, funds] = await instantiate({
            fundsClass: artifacts.require("../test_helpers/crowdsale/FundsRegistryTestHelper.sol")
        });

        await crowdsale.setTime(1508889600, {from: role.owner1});
        await crowdsale.sendTransaction({from: role.investor3, value: web3.toWei(20, 'finney')});
        await crowdsale.sendTransaction({from: role.investor2, value: web3.toWei(100, 'finney')});
        await assertBalances(crowdsale, token, funds, web3.toWei(120, 'finney'));

        assert.equal(await crowdsale.m_state(), 1);
        await funds.burnSomeEther({from: role.owner1});
        assert.equal(await crowdsale.m_state(), 1);

        await crowdsale.sendTransaction({from: role.investor1, value: web3.toWei(20, 'finney')});
        assert.equal(await crowdsale.m_state(), 2);

        await checkNoTransfers(crowdsale, token, funds);
        await checkNotInvesting(crowdsale, token, funds);
        await checkNotWithdrawing(crowdsale, token, funds);
        await checkNotSendingEther(crowdsale, token, funds);
    });


    it("test crowdsale replacement", async function() {
        const role = getRoles();

        const [crowdsale, token, funds] = await instantiate();

        await crowdsale.setTime(1508889600, {from: role.owner1});
        await crowdsale.sendTransaction({from: role.investor1, value: web3.toWei(20, 'finney')});
        await crowdsale.sendTransaction({from: role.investor2, value: web3.toWei(100, 'finney')});
        await assertBalances(crowdsale, token, funds, web3.toWei(120, 'finney'));
        assertBigNumberEqual(await token.balanceOf(role.investor1), STQ(2600));
        assertBigNumberEqual(await token.balanceOf(role.investor2), STQ(13000));

        // replace
        const crowdsale2 = await STQCrowdsale.new([role.owner1, role.owner2, role.owner3], token.address, funds.address,
                role.owner1, {from: role.nobody});
        await crowdsale2.setTime(1508889600, {from: role.owner1});

        await token.setController(crowdsale2.address, {from: role.owner1});
        await token.setController(crowdsale2.address, {from: role.owner2});

        await funds.setController(crowdsale2.address, {from: role.owner1});
        await funds.setController(crowdsale2.address, {from: role.owner2});

        // crowdsale is no longer functioning
        await checkNoTransfers(crowdsale, token, funds);
        await checkNotInvesting(crowdsale, token, funds);
        await checkNotWithdrawing(crowdsale, token, funds);
        await checkNotSendingEther(crowdsale, token, funds);

        // tokens and funds are intact
        await assertBalances(crowdsale2, token, funds, web3.toWei(120, 'finney'));
        assertBigNumberEqual(await token.balanceOf(role.investor1), STQ(2600));
        assertBigNumberEqual(await token.balanceOf(role.investor2), STQ(13000));
        assertBigNumberEqual(await token.totalSupply(), STQ(15600));

        // crowdsale2 is functioning
        await crowdsale2.sendTransaction({from: role.investor3, value: web3.toWei(40, 'finney')});
        await assertBalances(crowdsale2, token, funds, web3.toWei(160, 'finney'));
        assertBigNumberEqual(await token.balanceOf(role.investor1), STQ(2600));
        assertBigNumberEqual(await token.balanceOf(role.investor2), STQ(13000));
        assertBigNumberEqual(await token.balanceOf(role.investor3), STQ(5200));
        assertBigNumberEqual(await token.totalSupply(), STQ(20800));
    });


    it("test remaining lower than min investment", async function() {
        const role = getRoles();

        const [crowdsale, token, funds] = await instantiate();

        await crowdsale.setTime(1508889600, {from: role.owner1});

        await crowdsale.sendTransaction({from: role.investor1, value: web3.toWei(395, 'finney')});
        await assertBalances(crowdsale, token, funds, web3.toWei(395, 'finney'));

        await crowdsale.sendTransaction({from: role.investor3, value: web3.toWei(100, 'finney')});
        await assertBalances(crowdsale, token, funds, web3.toWei(398, 'finney'));   // 2 finney: pre-collected
        assert.equal(await crowdsale.m_state(), 4);
    });


    it("test circular buffer", async function() {
        const role = getRoles();

        let [crowdsale, token, funds] = await instantiate();

        // +10%
        await crowdsale.setTime(1511913599, {from: role.owner1});
        await crowdsale.setLastMaxInvestments(1, {from: role.owner1});

        await crowdsale.sendTransaction({from: role.investor1, value: web3.toWei(20, 'finney')});
        await crowdsale.sendTransaction({from: role.investor2, value: web3.toWei(100, 'finney')});
        await assertBalances(crowdsale, token, funds, web3.toWei(120, 'finney'));
        assertBigNumberEqual(await token.balanceOf(role.investor1), STQ(2200));
        assertBigNumberEqual(await token.balanceOf(role.investor2), STQ(11000));

        await crowdsale.setTime(1514246400, {from: role.owner1});
        await crowdsale.checkTime({from: role.owner1});
        await crowdsale.distributeBonuses(10, {from: role.nobody});

        assertBigNumberEqual(await token.balanceOf(role.investor1), STQ(2200));
        assertBigNumberEqual(await token.balanceOf(role.investor2), STQ(13000));

        // another test
        [crowdsale, token, funds] = await instantiate();

        // +0%
        await crowdsale.setTime(1513728001, {from: role.owner1});
        await crowdsale.setLastMaxInvestments(1, {from: role.owner1});

        await crowdsale.sendTransaction({from: role.investor1, value: web3.toWei(20, 'finney')});
        await crowdsale.sendTransaction({from: role.investor2, value: web3.toWei(100, 'finney')});
        await assertBalances(crowdsale, token, funds, web3.toWei(120, 'finney'));
        assertBigNumberEqual(await token.balanceOf(role.investor1), STQ(2000));
        assertBigNumberEqual(await token.balanceOf(role.investor2), STQ(10000));

        await crowdsale.setTime(1514246400, {from: role.owner1});
        await crowdsale.checkTime({from: role.owner1});
        await crowdsale.distributeBonuses(10, {from: role.nobody});

        assertBigNumberEqual(await token.balanceOf(role.investor1), STQ(2000));
        assertBigNumberEqual(await token.balanceOf(role.investor2), STQ(13000));
    });
});
