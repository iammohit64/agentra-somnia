// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/AgentToken.sol";
import "../src/Agentra.sol";
import "../src/AgentraReactor.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Token
        AgentToken token = new AgentToken();
        
        // 2. Deploy Agentra
        Agentra agentra = new Agentra(address(token), deployerAddress);

        // 3. Deploy Somnia Reactor Brain
        AgentraReactor reactor = new AgentraReactor(address(agentra));

        // 4. Authorize Reactor inside Agentra
        agentra.setReactor(address(reactor));

        vm.stopBroadcast();

        // 5. Write addresses to a temporary file
        string memory json = "temp_addresses";
        vm.serializeAddress(json, "AgentToken", address(token));
        vm.serializeAddress(json, "Agentra", address(agentra));
        string memory finalJson = vm.serializeAddress(json, "AgentraReactor", address(reactor));
        
        vm.writeJson(finalJson, "./temp_addresses.json");
    }
}