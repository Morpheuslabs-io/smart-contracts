'use strict';

// testrpc has to be run as testrpc -u 0 -u 1

import expectThrow from './helpers/expectThrow';
import {l, logEvents} from './helpers/debug';

const STQToken = artifacts.require("./STQToken.sol");


contract('STQToken', function(accounts) {

    function getRoles() {
        return {
            owner3: accounts[0],
            owner1: accounts[1],
            owner2: accounts[2],
            investor1: accounts[2],
            investor2: accounts[3],
            investor3: accounts[4],
            nobody: accounts[5]
        };
    }

    // converts amount of STQ into STQ-wei
    function STQ(amount) {
        return web3.toWei(amount, 'ether');
    }

    async function instantiate() {
        const role = getRoles();

        const token = await STQToken.new([role.owner1, role.owner2, role.owner3], {from: role.nobody});

        await token.setController(role.owner1, {from: role.owner1});
        await token.setController(role.owner1, {from: role.owner2});

        await token.mint(role.investor1, STQ(10), {from: role.owner1});
        await token.mint(role.investor2, STQ(12), {from: role.owner1});
        await token.disableMinting({from: role.owner1});

        await token.startCirculation({from: role.owner1});

        return token;
    }


    it("test ERC20 is supported", async function() {
        const role = getRoles();
        const token = await instantiate();

        await token.name({from: role.nobody});
        await token.symbol({from: role.nobody});
        await token.decimals({from: role.nobody});

        assert((await token.totalSupply({from: role.nobody})).eq(STQ(22)));
        assert.equal(await token.balanceOf(role.investor1, {from: role.nobody}), STQ(10));

        await token.transfer(role.investor2, STQ(2), {from: role.investor1});
        assert.equal(await token.balanceOf(role.investor1, {from: role.nobody}), STQ(8));
        assert.equal(await token.balanceOf(role.investor2, {from: role.nobody}), STQ(14));

        await token.approve(role.investor2, STQ(3), {from: role.investor1});
        assert.equal(await token.allowance(role.investor1, role.investor2, {from: role.nobody}), STQ(3));
        await token.transferFrom(role.investor1, role.investor3, STQ(2), {from: role.investor2});
        assert.equal(await token.allowance(role.investor1, role.investor2, {from: role.nobody}), STQ(1));
        assert.equal(await token.balanceOf(role.investor1, {from: role.nobody}), STQ(6));
        assert.equal(await token.balanceOf(role.investor2, {from: role.nobody}), STQ(14));
        assert.equal(await token.balanceOf(role.investor3, {from: role.nobody}), STQ(2));
    });
});
