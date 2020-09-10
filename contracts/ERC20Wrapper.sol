pragma solidity ^0.6.2;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155Receiver.sol";
import "./IShareToken.sol";

//the approch here is simple
//Give erc1155 get erc20s
//give erc20 get erc1155

contract ERC20Wrapper is ERC20, ERC1155Receiver {
    uint256 public tokenId; //What tokenId is it a wrapper for

    IShareToken public shareToken;
    IERC20 public cash;
    address public augurFoundry;

    //WhoEver called this constructor should be able to controll it
    constructor(
        address _augurFoundry,
        IShareToken _shareToken,
        IERC20 _cash,
        uint256 _tokenId,
        string memory _name,
        string memory _symbol,
        uint8 _decimals
    ) public ERC20(_name, _symbol) {
        //Set the decimals equal to numTicks of market associated with the tokenId
        _setupDecimals(_decimals);
        augurFoundry = _augurFoundry;
        tokenId = _tokenId;
        shareToken = _shareToken;
        cash = _cash;
    }

    //This contract should be setApproveForAll by the caller
    function wrapTokens(address _account, uint256 _amount) public {
        //Take ERC1155 from them
        //mint ERC20 to them

        if (msg.sender != augurFoundry) {
            shareToken.safeTransferFrom(
                msg.sender,
                address(this),
                tokenId,
                _amount,
                ""
            );
        }

        //Now just mint the user some erc20s
        _mint(_account, _amount);
    }

    //If someone wants to unwrap tokens for the user
    function unWrapTokens(address _account, uint256 _amount) public {
        //burn it first
        //if the caller is augur foundry then no need for allowance to be checked
        if (msg.sender != _account && msg.sender != augurFoundry) {
            uint256 decreasedAllowance = allowance(_account, _msgSender()).sub(
                _amount,
                "ERC20: burn amount exceeds allowance"
            );
            _approve(_account, _msgSender(), decreasedAllowance);
        }
        _burn(_account, _amount);
        //now transfer them erc1155
        shareToken.safeTransferFrom(
            address(this),
            _account,
            tokenId,
            _amount,
            ""
        );
    }

    //If the market has finalized users should call this function
    function claim(address _account) public {
        //if the proeceeds are not claimed
        if (shareToken.balanceOf(address(this), tokenId) != 0) {
            shareToken.claimTradingProceeds(
                shareToken.getMarket(tokenId),
                address(this),
                ""
            );
        }
        uint256 cashBalance = cash.balanceOf(address(this));
        //now the contract will give the user thier share of winnig procceeds
        if (cashBalance != 0) {
            //This means that there were some winnigs and you are going to get your share of it
            uint256 userShare = (cashBalance.mul(balanceOf(_account))).div(
                totalSupply()
            );

            cash.transfer(_account, userShare);
            //Now burn the users wrapper tokens
            _burn(_account, balanceOf(_account));
        }
        //else it means that this was not the winning outcome so user gets nothing
    }

    //We can add a function that claims winnings ones the market is finalized directly for the ERC20
    //Holder without requiring it to be converted in to ERC1155s

    /**
        @dev Handles the receipt of a single ERC1155 token type. This function is
        called at the end of a `safeTransferFrom` after the balance has been updated.
        To accept the transfer, this must return
        `bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))`
        (i.e. 0xf23a6e61, or its own function selector).
        @param operator The address which initiated the transfer (i.e. msg.sender)
        @param from The address which previously owned the token
        @param id The ID of the token being transferred
        @param value The amount of tokens being transferred
        @param data Additional data with no specified format
        @return `bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))` if transfer is allowed
    */
    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external override returns (bytes4) {
        require(id == tokenId, "Not acceptable"); //Do not a tokenId other than what this ERC20 is a wrapper for
        return (
            bytes4(
                keccak256(
                    "onERC1155Received(address,address,uint256,uint256,bytes)"
                )
            )
        );
    }

    /**
        @dev Handles the receipt of a multiple ERC1155 token types. This function
        is called at the end of a `safeBatchTransferFrom` after the balances have
        been updated. To accept the transfer(s), this must return
        `bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))`
        (i.e. 0xbc197c81, or its own function selector).
        @param operator The address which initiated the batch transfer (i.e. msg.sender)
        @param from The address which previously owned the token
        @param ids An array containing ids of each token being transferred (order and length must match values array)
        @param values An array containing amounts of each token being transferred (order and length must match ids array)
        @param data Additional data with no specified format
        @return `bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))` if transfer is allowed
    */
    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external override returns (bytes4) {
        //This is not allowed
        //transfer just one predefined id here
        return "";
    }
}
