'use strict';

const _wallet = '0x0Eed5de3487aEC55bA585212DaEDF35104c27bAF';
const STQTokenAddress = '0x5c3a228510D246b78a3765C20221Cbf3082b44a4';
const STQPreICO3 = artifacts.require("./STQPreICO3.sol");


module.exports = function(deployer, network) {
  return deployer.deploy(STQPreICO3, STQTokenAddress, _wallet);


};
