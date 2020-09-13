pragma solidity ^0.6.2;
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "./MockCash.sol";

//Made specifically for the unit tests
contract MockShareToken is ERC1155 {
    MockCash cash;
    uint256 public constant amount = 1000 ether;
    uint256 public constant tokenId = 1;
    uint256[] outcomeFees = [1, 2, 3];

    constructor(string memory _uri, address _cash) public ERC1155(_uri) {
        cash = MockCash(_cash);
    }

    function mint(
        address _account,
        uint256 _tokenId,
        uint256 _amount
    ) public {
        _mint(_account, _tokenId, _amount, "");
    }

    function getMarket(uint256 tokenId) external pure returns (address) {
        return address(0);
    }

    function claimTradingProceeds(
        address _market,
        address _shareHolder,
        bytes32 _fingerprint
    ) external returns (uint256[] memory _outcomeFees) {
        _burn(msg.sender, tokenId, balanceOf(msg.sender, tokenId));
        cash.mint(msg.sender, amount);
        return outcomeFees;
    }
}
