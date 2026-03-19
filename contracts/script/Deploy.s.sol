// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/AgentToken.sol";
import "../src/Agentra.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Token
        AgentToken token = new AgentToken();
        
        // 2. Deploy Agentra (passing token address and deployer as admin)
        Agentra agentra = new Agentra(address(token), deployerAddress);

        vm.stopBroadcast();

        // 3. Write addresses to a temporary file for our formatter to pick up
        string memory json = "temp_addresses";
        vm.serializeAddress(json, "AgentToken", address(token));
        string memory finalJson = vm.serializeAddress(json, "Agentra", address(agentra));
        vm.writeJson(finalJson, "./temp_addresses.json");
    }
}