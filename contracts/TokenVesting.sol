// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import './Ownable.sol';
import './ChainlinkETHUSDPriceConsumer.sol';
import './IERC20.sol';

contract Crowdsale is Ownable {
    address public eth_usd_consumer_address;
    ChainlinkETHUSDPriceConsumer private eth_usd_pricer;
    uint8 private eth_usd_pricer_decimals;
    IERC20 public token;
    
    mapping (address => uint256) public vestedAmount;
    mapping (address => uint256) public ethDeposited;
    
    uint256 public totalVested;
    uint256 public totalEthDeposited;
    
    uint256 private ethStepOne = 10e18;
    uint256 private ethStepTwo = 50e18;
    uint256 private tokenDecimals = 18;
    uint256 private fine = 30;
    
    // 1e6 precision
    uint256 private ethStepOnePrice = 250000;
    uint256 private ethStepTwoPrice = 150000;
    uint256 private ethStepThreePrice = 100000;
    
    uint256 public startDate;
    
    uint256 public oneMonth = 10 minutes;
    uint256 public twoMonths = 20 minutes;
    uint256 public sixMonths = 30 minutes;
    
    uint256 private constant PRICE_PRECISION = 1e6;

    constructor (uint256 _startDate, address _token, address _eth_usd_consumer_address) /*public*/ {
        require(block.timestamp < _startDate, "startDate has not come yet");
        startDate = _startDate;
        token = IERC20(_token);
        setETHUSDOracle(_eth_usd_consumer_address);
    }
    
    fallback() external payable {
        buyTokens();
    }
    
    receive() external payable {
        buyTokens();
    }
    
    function buyTokens() public payable {
        // Get the ETH / USD price first, and cut it down to 1e6 precision
        uint256 eth_usd_price = 1000/*uint256(eth_usd_pricer.getLatestPrice()) * (PRICE_PRECISION) / (uint256(10) ** eth_usd_pricer_decimals)*/;
        uint256 usdDeposited = msg.value * eth_usd_price / 1e18;
        ethDeposited[msg.sender] = msg.value;
        totalEthDeposited += msg.value;
        uint256 vested;
        
        if(msg.value <= ethStepOne) {
            token.transfer(msg.sender, usdDeposited * (uint256(10) ** (tokenDecimals))/ ethStepOnePrice ); // First, you have to multiply, then divide
            payable(_owner).transfer(msg.value);
            totalEthDeposited -= msg.value;
        } else if(msg.value <= ethStepTwo) {
            vested = usdDeposited  * (uint256(10) ** (tokenDecimals))/ ethStepTwoPrice; // First, you have to multiply, then divide
            vestedAmount[msg.sender] += vested;
        } else if(msg.value > ethStepTwo) {
            vested = usdDeposited * (uint256(10) ** (tokenDecimals)) / ethStepThreePrice; // First, you have to multiply, then divide
            vestedAmount[msg.sender] += vested;
        } 
        
        require(vested <= token.balanceOf(address(this)) - totalVested, "Not enough tokens in contract");
        totalVested += vested;
    }
    
    function claim() public {
        require(block.timestamp >= startDate + sixMonths, 'Six months did not pass since the creation of the contract');
        uint256 tokensToSend = unlockedTokens(msg.sender);
        vestedAmount[msg.sender] -= tokensToSend;
        
        token.transfer(msg.sender, vestedAmount[msg.sender]);
    }
    
    function unlockedTokens(address _address) public view returns(uint256) {
        if(block.timestamp < (startDate + sixMonths)) {
            return 0;
        }
        
        uint256 monthsPassed = ((block.timestamp - (startDate + sixMonths)) / oneMonth) + 1;
        monthsPassed = monthsPassed > 10 ? 10 : monthsPassed;
        
        return vestedAmount[_address] * 10 * monthsPassed / 100;
    }
    
    function setETHUSDOracle(address _eth_usd_consumer_address) public onlyOwner {
        eth_usd_consumer_address = _eth_usd_consumer_address;
        eth_usd_pricer = ChainlinkETHUSDPriceConsumer(_eth_usd_consumer_address);
        eth_usd_pricer_decimals = eth_usd_pricer.getDecimals();
    }
    
    function withdrawETH() public {
        require(block.timestamp <= startDate + twoMonths);
    
        uint256 amountToSend = ethDeposited[msg.sender] - ethDeposited[msg.sender] * fine / 100;
        
        ethDeposited[msg.sender] = 0;
        vestedAmount[msg.sender] = 0;
        
        payable(address(msg.sender)).transfer(amountToSend);
    }
    
    function claimEth() public onlyOwner {
        if(block.timestamp > startDate + twoMonths) {
            payable(address(msg.sender)).transfer(address(this).balance);
        } else {
            payable(address(msg.sender)).transfer(totalEthDeposited * fine / 100);
        }
    }
}
