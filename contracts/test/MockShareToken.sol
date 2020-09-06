pragma solidity ^0.6.2;
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockShareToken is ERC1155 {
    IERC20 cash;

    constructor(string memory _uri, address _cash) public ERC1155(_uri) {
        cash = IERC20(_cash);
    }

    function mint(
        address _account,
        uint256 _tokenId,
        uint256 _amount
    ) public {
        _mint(_account, _tokenId, _amount, "");
    }

    // function buyCompleteSets(
    //     IMarket _market,
    //     address _account,
    //     uint256 _amount
    // ) external returns (bool) {
    //     cash.transferFrom(msg.sender, _account, _amount);
    //     mint(_account,_tokenIds)
    // }
    // function claimTradingProceeds(
    //     address _market,
    //     address _shareHolder,
    //     bytes32 _fingerprint
    // ) external returns (uint256[] memory _outcomeFees) {
    //     return uint256[;
    // }
}
