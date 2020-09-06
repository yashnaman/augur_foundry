pragma solidity ^0.6.2;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SimpleERC20 is ERC20 {
    constructor(uint256 _initialSupply) public ERC20("Simple", "SIM") {
        _mint(msg.sender, _initialSupply);
    }
}
