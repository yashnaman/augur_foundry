pragma solidity ^0.6.2;
import "./ERC20Wrapper.sol";
import "./IShareToken.sol";
pragma experimental ABIEncoderV2;

contract AugurFoundry is ERC1155Receiver {
    // address universe;
    // address augur;
    IShareToken shareToken;

    mapping(uint256 => address) public wrappers;

    //Make a buy complete shares function but that should mean that they do not have to wrap
    //their tokens

    constructor(IShareToken _shareToken) public {
        shareToken = _shareToken;
    }

    //Note : use CREATE2
    function newERC20Wrapper(
        uint256 _tokenId,
        string memory _name,
        string memory _symbol
    ) public {
        ERC20Wrapper erc20Wrapper = new ERC20Wrapper(
            address(this),
            _tokenId,
            shareToken,
            _name,
            _symbol
        );
        wrappers[_tokenId] = address(erc20Wrapper);
    }

    function newERC20Wrappers(
        uint256[] memory _tokenIds,
        string[] memory _names,
        string[] memory _symbols
    ) public {
        assert(
            _tokenIds.length == _names.length &&
                _tokenIds.length == _symbols.length
        );
        ERC20Wrapper erc20Wrapper;
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            erc20Wrapper = new ERC20Wrapper(
                address(this),
                _tokenIds[i],
                shareToken,
                _names[i],
                _symbols[i]
            );
            wrappers[_tokenIds[i]] = address(erc20Wrapper);
        }
    }

    //Before calling this it is required that msg.sender has setApprovalForAll to this contract
    function wrapTokens(
        uint256 _tokenId,
        address _account,
        uint256 _amount
    ) public {
        ERC20Wrapper erc20Wrapper = ERC20Wrapper(wrappers[_tokenId]);
        shareToken.safeTransferFrom(
            msg.sender,
            address(erc20Wrapper),
            _tokenId,
            _amount,
            ""
        );
        erc20Wrapper.wrapTokens(_account, _amount);
    }

    //This will take more gas than just unwrapping directly by calling the erc20Token
    function unWrapTokens(uint256 _tokenId, uint256 _amount) public {
        ERC20Wrapper erc20Wrapper = ERC20Wrapper(wrappers[_tokenId]);
        erc20Wrapper.unWrapTokens(msg.sender, _amount);
    }

    //Before calling this it is required that msg.sender has setApprovalForAll to this contract
    function wrapMultipleTokens(
        uint256[] memory _tokenIds,
        address _account,
        uint256[] memory _amounts
    ) public {
        ERC20Wrapper erc20Wrapper;
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            erc20Wrapper = ERC20Wrapper(wrappers[_tokenIds[i]]);
            shareToken.safeTransferFrom(
                msg.sender,
                address(erc20Wrapper),
                _tokenIds[i],
                _amounts[i],
                ""
            );
            erc20Wrapper.wrapTokens(_account, _amounts[i]);
        }
    }

    //This will take more gas than just unwrapping directly by calling the erc20Token
    function unWrapMultipleTokens(
        uint256[] memory _tokenIds,
        uint256[] memory _amounts
    ) public {
        ERC20Wrapper erc20Wrapper;
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            erc20Wrapper = ERC20Wrapper(wrappers[_tokenIds[i]]);
            erc20Wrapper.unWrapTokens(msg.sender, _amounts[i]);
        }
    }

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
        return
            bytes4(
                keccak256(
                    "onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"
                )
            );
    }
}
