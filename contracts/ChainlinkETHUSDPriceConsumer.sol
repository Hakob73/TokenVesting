// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import './AggregatorV3Interface.sol';

contract ChainlinkETHUSDPriceConsumer {

    AggregatorV3Interface internal priceFeed;


    constructor() {
        priceFeed = AggregatorV3Interface(0x9326BFA02ADD2366b30bacB125260Af641031331);
    }

    /**
     * Returns the latest price
     */
    function getLatestPrice() public view returns (int) {
        (
            , 
            int price,
            ,
            ,
            
        ) = priceFeed.latestRoundData();
        return price;
    }
    
    function getDecimals() public /*view*/ pure returns (uint8) {
        // return priceFeed.decimals();
        return 18;
    }
}