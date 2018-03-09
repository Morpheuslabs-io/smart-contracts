'use strict';

const _owners = ['0xdad209d09b0fec404Da4204672372771bad3D683', '0x0Eed5de3487aEC55bA585212DaEDF35104c27bAF', '0x06bA0d658578b014b5fEBdAF6992bFd41bd44483'];

const STQTokenAddress = '0x5c3a228510D246b78a3765C20221Cbf3082b44a4';
const STQCrowdsale = artifacts.require("./STQCrowdsale.sol");
const FundsRegistry = artifacts.require("./FundsRegistry.sol");


module.exports = function(deployer, network) {
  deployer.deploy(FundsRegistry, _owners, 2, 0).then(function(){
    return deployer.deploy(STQCrowdsale, _owners, STQTokenAddress, FundsRegistry.address, '0x0Eed5de3487aEC55bA585212DaEDF35104c27bAF');
  });

  // owners have to manually perform
  // FundsRegistry.setController(address of STQCrowdsale);
  // STQToken.setController(address of STQCrowdsale);
};
