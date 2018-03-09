'use strict';

// testrpc has to be run as testrpc -u 0 -u 1 -u 2 -u 3 -u 4 -u 5

import expectThrow from './helpers/expectThrow';
import {l, logEvents} from './helpers/debug';
import {instantiateCrowdsale} from './helpers/storiqa';

const STQPreSale = artifacts.require("./STQPreSale.sol");
const STQToken = artifacts.require("./STQToken.sol");


contract('STQPreSale', function(accounts) {

    function getRoles() {
        return {
            cash: accounts[0],
            owner3: accounts[0],
            owner1: accounts[1],
            owner2: accounts[2],
            investor1: accounts[2],
            investor2: accounts[3],
            investor3: accounts[4],
            nobody: accounts[5]
        };
    }

    async function instantiate() {
        const role = getRoles();

        const token = await STQToken.new([role.owner1, role.owner2, role.owner3], {from: role.nobody});
        const preSale = await STQPreSale.new(token.address, role.cash, {from: role.nobody});
        preSale.transferOwnership(role.owner1, {from: role.nobody});

        await token.setController(preSale.address, {from: role.owner1});
        await token.setController(preSale.address, {from: role.owner2});

        return [preSale, token, role.cash];
    }

    async function assertBalances(preSale, token, cash, cashInitial, added) {
        assert.equal(await web3.eth.getBalance(preSale.address), 0);
        assert.equal(await web3.eth.getBalance(token.address), 0);
        assert((await web3.eth.getBalance(cash)).sub(cashInitial).eq(added));
    }

    // converts amount of STQ into STQ-wei
    function STQ(amount) {
        // decimals is the same as in ether, so..
        return web3.toWei(amount, 'ether');
    }

    async function checkNoTransfers(token) {
        const role = getRoles();

        await expectThrow(token.transfer(role.nobody, STQ(2.5), {from: role.nobody}));
        await expectThrow(token.transfer(role.investor3, STQ(2.5), {from: role.nobody}));
        await expectThrow(token.transfer(role.investor3, STQ(2.5), {from: role.investor2}));
    }


    it("test instantiation", async function() {
        const role = getRoles();
        const cashInitial = await web3.eth.getBalance(role.cash);

        const [preSale, token, cash] = await instantiate();

        assert.equal(await token.m_controller(), preSale.address);

        await assertBalances(preSale, token, cash, cashInitial, 0);
    });


    it("test investments", async function() {
        const role = getRoles();
        const cashInitial = await web3.eth.getBalance(role.cash);

        const [preSale, token, cash] = await instantiate();

        await preSale.sendTransaction({from: role.investor1, value: web3.toWei(20, 'finney')});
        await assertBalances(preSale, token, cash, cashInitial, web3.toWei(20, 'finney'));
        assert((await token.balanceOf(role.investor1)).eq(STQ(3000)));

        await expectThrow(preSale.sendTransaction({from: role.nobody, value: web3.toWei(0, 'finney')}));
        assert.equal(await token.balanceOf(role.nobody), STQ(0));

        assert((await token.totalSupply()).eq(STQ(3000)));

        // cant invest into other contracts
        await expectThrow(token.sendTransaction({from: role.investor1, value: web3.toWei(20, 'finney')}));

        // second investor
        await preSale.sendTransaction({from: role.investor2, value: web3.toWei(40, 'finney')});
        await assertBalances(preSale, token, cash, cashInitial, web3.toWei(60, 'finney'));
        assert((await token.balanceOf(role.investor1)).eq(STQ(3000)));
        assert((await token.balanceOf(role.investor2)).eq(STQ(6000)));
        assert((await token.totalSupply()).eq(STQ(9000)));

        // second investment of the investor1
        await preSale.sendTransaction({from: role.investor1, value: web3.toWei(60, 'finney')});
        await assertBalances(preSale, token, cash, cashInitial, web3.toWei(120, 'finney'));
        assert((await token.balanceOf(role.investor1)).eq(STQ(12000)));
        assert((await token.balanceOf(role.investor2)).eq(STQ(6000)));
        assert((await token.totalSupply()).eq(STQ(18000)));

        await checkNoTransfers(token);
    });


    it("test reusable token", async function() {
        const role = getRoles();

        // ok, we have an existing token
        const [crowdsale, token, funds] = await instantiateCrowdsale(role);

        await crowdsale.setTime(1505692800, {from: role.owner1});
        await crowdsale.sendTransaction({from: role.investor1, value: web3.toWei(40, 'finney')});
        assert.equal(await token.balanceOf(role.investor1), STQ(5));

        // and we're starting a presale
        const preSale = await STQPreSale.new(token.address, role.cash, {from: role.nobody});
        preSale.transferOwnership(role.owner1, {from: role.nobody});

        await token.setController(preSale.address, {from: role.owner1});
        await token.setController(preSale.address, {from: role.owner2});

        await preSale.sendTransaction({from: role.investor2, value: web3.toWei(40, 'finney')});
        assert((await token.balanceOf(role.investor1)).eq(STQ(5)));
        assert((await token.balanceOf(role.investor2)).eq(STQ(6000)));
        assert((await token.totalSupply()).eq(STQ(6005)));
    });
});
