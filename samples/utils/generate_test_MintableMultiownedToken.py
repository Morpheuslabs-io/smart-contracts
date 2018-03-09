#!/usr/bin/env python3

from itertools import permutations


def main():
    for op_list in permutations(['transfer', 'mint', 'emission']):
        print('''
    it("test ''' + ','.join(op_list) + '''", async function() {
        const role = getRoles();

        const instance = await MintableMultiownedTokenTestHelper.new([role.owner1, role.owner2], 2, role.minter, {from: role.nobody});

        await instance.mint(role.investor1, web3.toWei(10, 'ether'), {from: role.minter});
        await instance.mint(role.investor2, web3.toWei(6, 'ether'), {from: role.minter});
''')

        balance = {
            1: 10,
            2: 6
        }

        emission_amount = 6

        had_emission = {
            1: False,
            2: False
        }
        emission_percent = None
        in_emission_pool = [0]

        def total_supply():
            return sum(balance.values()) + in_emission_pool[0]

        def assert_balances():
            for acc in sorted(balance):
                print('''        assert.equal(await instance.balanceOf(role.investor{}), web3.toWei({}, 'ether'));'''.format(acc, balance[acc]))
            print('''        assert.equal(await instance.totalSupply(), web3.toWei({}, 'ether'));'''.format(total_supply()))

        def emit(to_acc):
            if had_emission[to_acc]:
                addon = balance[to_acc] * emission_percent
                balance[to_acc] += addon
                in_emission_pool[0] -= addon

            had_emission[to_acc] = False

            if not filter(None, had_emission.values()):
                assert 0 == in_emission_pool[0]

        for op in op_list:
            if op == 'transfer':
                amount = 2
                print('''        await instance.transfer(role.investor2, web3.toWei({}, 'ether'), {{from: role.investor1}});'''.format(amount))
                emit(1)
                balance[1] -= amount
                emit(2)
                balance[2] += amount

            elif op == 'mint':
                amount = 4
                print('''        await instance.mint(role.investor1, web3.toWei({}, 'ether'), {{from: role.minter}});'''.format(amount))
                emit(1)
                balance[1] += amount
                if had_emission[2]:
                    print('''        await instance.requestDividends({from: role.investor2});''')
                    emit(2)

            elif op == 'emission':
                print('''        await instance.emission(web3.toWei({}, 'ether'), {{from: role.owner1}});'''.format(emission_amount))
                had_emission = {
                    1: True,
                    2: True
                }
                emission_percent = emission_amount / total_supply()
                in_emission_pool = [emission_amount]

            print()

            assert_balances()

        print('''
        await checkMintingOnlyByMinter(instance);
        await checkIllegalTransfersThrows(instance);
    });
''')


main()
