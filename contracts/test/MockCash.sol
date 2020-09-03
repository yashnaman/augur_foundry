pragma solidity ^0.6.2;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SimpleERC20 is ERC20 {
    constructor() public ERC20("Cash", "CASH") {}

    function mint(address _account, uint256 _amount) public {
        _mint(_account, _amount);
    }
}
