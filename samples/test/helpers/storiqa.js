export async function instantiateCrowdsale(roles, args=undefined) {
    if (undefined == args)
        args = {};

    const STQToken = artifacts.require("./STQToken.sol");
    const FundsRegistry = artifacts.require("./crowdsale/FundsRegistry.sol");
    const STQCrowdsale = artifacts.require("../test_helpers/STQCrowdsaleTestHelper.sol");

    const role = roles;

    const funds = await (args.fundsClass || FundsRegistry).new([role.owner1, role.owner2, role.owner3], 2, 0, {from: role.deployer});
    const token = await STQToken.new([role.owner1, role.owner2, role.owner3], {from: role.deployer});
    const crowdsale = await STQCrowdsale.new([role.owner1, role.owner2, role.owner3], token.address, funds.address,
            role.owner1, {from: role.deployer});

    await token.setController(crowdsale.address, {from: role.owner1});
    await token.setController(crowdsale.address, {from: role.owner2});

    await funds.setController(crowdsale.address, {from: role.owner1});
    await funds.setController(crowdsale.address, {from: role.owner2});

    return [crowdsale, token, funds];
}
