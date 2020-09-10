pragma solidity ^0.6.2;
import "./ERC20Wrapper.sol";
import "./IShareToken.sol";
pragma experimental ABIEncoderV2;

contract AugurFoundry {
    // address universe;
    // address augur;
    IShareToken public shareToken;
    IERC20 public cash;

    mapping(uint256 => address) public wrappers;

    constructor(IShareToken _shareToken, IERC20 _cash) public {
        cash = _cash;
        shareToken = _shareToken;
    }

    //Note : use CREATE2
    function newERC20Wrapper(
        uint256 _tokenId,
        string memory _name,
        string memory _symbol,
        uint8 _decimals
    ) public {
        require(wrappers[_tokenId] == address(0), "Wrapper already created");
        ERC20Wrapper erc20Wrapper = new ERC20Wrapper(
            address(this),
            shareToken,
            cash,
            _tokenId,
            _name,
            _symbol,
            _decimals
        );
        wrappers[_tokenId] = address(erc20Wrapper);
    }

    function newERC20Wrappers(
        uint256[] memory _tokenIds,
        string[] memory _names,
        string[] memory _symbols,
        uint8[] memory _decimals
    ) public {
        assert(
            _tokenIds.length == _names.length &&
                _tokenIds.length == _symbols.length
        );
        ERC20Wrapper erc20Wrapper;
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            newERC20Wrapper(_tokenIds[i], _names[i], _symbols[i], _decimals[i]);
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
}
