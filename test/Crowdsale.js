const { expect } = require("chai");
const { ethers } = require("hardhat");

let owner, ChainlinkETHUSDPriceConsumer, DAF, Crowdsale, eth_usd_consumer, dartInstance, provider, crowdsaleInstance

beforeEach(async function() {
    [owner, ...signers] = await ethers.getSigners();
    ChainlinkETHUSDPriceConsumer = await ethers.getContractFactory('ChainlinkETHUSDPriceConsumer')
    DAF =  await ethers.getContractFactory('DAF')
    Crowdsale = await ethers.getContractFactory('Crowdsale')    
    eth_usd_consumer = await ChainlinkETHUSDPriceConsumer.deploy()
    dartInstance = await DAF.deploy('dArtflex Token', 'DART')
    provider = ethers.getDefaultProvider();
    crowdsaleInstance = await Crowdsale.deploy((await provider.getBlock('latest')).timestamp + 1500, dartInstance.address,eth_usd_consumer.address)
})

describe("Crowdsale", function() {

  
    it("Constructor(): Should throw a startDay Error", async function() {
        

        await expect(Crowdsale.deploy((await provider.getBlock('latest')).timestamp,dartInstance.address,eth_usd_consumer.address)).to.be.revertedWith('startDate has not come yet')
    
    });

    it('buyTokens(): ethStepOne Case - Should transfer DAF tokens with worth of msg.value to the msg.sender', async function() {
        
        await dartInstance.mint(owner.address, ethers.BigNumber.from(15).pow(18));
        await dartInstance.transfer(signers[0].address, ethers.BigNumber.from(10).pow(18));
        await dartInstance.transfer(crowdsaleInstance.address, ethers.BigNumber.from(10).pow(18));

        const dafBalanceBefore = await dartInstance.balanceOf(signers[0].address);

        await crowdsaleInstance.connect(signers[0]).buyTokens({value: ethers.utils.parseEther("10") });

        const dafBalanceAfter = await dartInstance.balanceOf(signers[0].address);

       
        expect((dafBalanceAfter - dafBalanceBefore)/1e18).to.equal(0.04) // 10(msg.value) * 1000(eth price) / 250000(ethStepOne)
        

    })


    it('buyTokens(): ethStepOne Case - Should keep the amount of deposited eth unchanged and return msg.value back if the msg.value is less than or equal to 10ETH', async function() {
    
        await dartInstance.mint(owner.address, ethers.BigNumber.from(15).pow(18));
        await dartInstance.transfer(crowdsaleInstance.address, ethers.BigNumber.from(10).pow(18));

        const totalEthDepositedBefore = await crowdsaleInstance.totalEthDeposited();
        const balanceBefore = await owner.getBalance();

        await crowdsaleInstance.buyTokens({value: ethers.utils.parseEther("9") });
        await crowdsaleInstance.buyTokens({value: ethers.utils.parseEther("10") });

        const totalEthDepositedAfter = await crowdsaleInstance.totalEthDeposited();
        const balanceAfter = await owner.getBalance();

        expect(totalEthDepositedBefore).to.equal(totalEthDepositedAfter)
        expect(balanceAfter - balanceBefore).to.be.below(1e3) // Balance of the user is going to charged only for executing transactions, but not for msg.values
        

    })


    it('buyTokens(): ethStepTwo Case - Should add msg.value to the amount of deposited eth, and increase the vested amount with the right formula when msg.value is between 10ETH and 50ETH', async function() {
        
        await dartInstance.mint(owner.address, ethers.BigNumber.from(15).pow(18));
        await dartInstance.transfer(crowdsaleInstance.address, ethers.BigNumber.from(10).pow(18));

        const totalVestedBefore = await crowdsaleInstance.totalVested();
        const vestedAmountBefore = await crowdsaleInstance.vestedAmount(owner.address);

        await crowdsaleInstance.buyTokens({value: ethers.utils.parseEther("15") });

        const vestedAmountAfter = await crowdsaleInstance.vestedAmount(owner.address);
        const totalVestedAfter = await crowdsaleInstance.totalVested();

    expect((vestedAmountAfter - vestedAmountBefore)/1e18).to.equal(0.1); // 0.1 == 15(msg.value) * 1000(ethToUsd) / 150000(ethStepTwo)
        expect((totalVestedAfter - totalVestedBefore)/1e18).to.equal(0.1);
    })


    it('buyTokens() ethStepThree Case - Should add msg.value to the amount of deposited eth, and increase the vested amount with the right formula when msg.value is more than 50ETH', async function() {
        await dartInstance.mint(owner.address, ethers.BigNumber.from(15).pow(18));
        await dartInstance.transfer(crowdsaleInstance.address, ethers.BigNumber.from(10).pow(18));

        const totalVestedBefore = await crowdsaleInstance.totalVested();
        const vestedAmountBefore = await crowdsaleInstance.vestedAmount(owner.address);

        await crowdsaleInstance.buyTokens({value: ethers.utils.parseEther("60") });

        const vestedAmountAfter = await crowdsaleInstance.vestedAmount(owner.address);
        const totalVestedAfter = await crowdsaleInstance.totalVested();

        expect((vestedAmountAfter - vestedAmountBefore)/1e18).to.equal(0.6); // 0.1 == 60(msg.value) * 1000(ethToUsd) / 100000(ethStepTwo)
        expect((totalVestedAfter - totalVestedBefore)/1e18).to.equal(0.6);

    })

    it('claim(): Should revert with time requirment error', async function() {
        await dartInstance.mint(owner.address, ethers.BigNumber.from(15).pow(18));
        await dartInstance.transfer(crowdsaleInstance.address, ethers.BigNumber.from(10).pow(18));

        await crowdsaleInstance.buyTokens({value: ethers.utils.parseEther("60") });

        await expect(crowdsaleInstance.claim()).to.be.revertedWith('Six months did not pass since the creation of the contract')
    })



});