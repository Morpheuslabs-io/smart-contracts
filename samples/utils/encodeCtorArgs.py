#!/usr/bin/env python3


def encodeUint(u):
    return '{:064X}'.format(u)

def encodeAddress(address):
    return encodeUint(address)

def encodeAddressArray(addresses):
    return encodeUint(len(addresses)) + ''.join(map(encodeAddress, addresses))


def main():
    owners = [0x1Fa6D88d4AB7bEAF2549EC55101e9Ec0b037d834, 0x844a35B6d9a82695cF1aa87Fabe867e219833FE6, 0x11F0a1D22a195C342c7e76f9ab5173C7c2244471]
    STQToken_address = 0x46eebe4331dd83633c81014945c10ab6cd0c9a13
    FundsRegistry_address = 0xc045aeef2a42d2e07a02b1c9689e7f97b74d8954

    print("STQToken:", encodeAddressArray(owners))
    print("FundsRegistry:",  (
        encodeUint(3 * 32)      # offset of the dynamic array
        + encodeUint(2)         # arg: uint 2
        + encodeAddress(0)      # arg: address 0
        + encodeAddressArray(owners)    # arg: dynamic array  _owners
    ))
    print("STQCrowdsale:", encodeAddressArray(owners) + encodeAddress(STQToken_address) + encodeAddress(FundsRegistry_address))


main()
