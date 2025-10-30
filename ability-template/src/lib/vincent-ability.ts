import {
  createVincentAbility,
  supportedPoliciesForAbility,
} from '@lit-protocol/vincent-ability-sdk';
import { laUtils } from '@lit-protocol/vincent-scaffold-sdk';

import type { EthersType /*LitNamespace*/ } from '../Lit';

import {
  executeFailSchema,
  executeSuccessSchema,
  precheckFailSchema,
  precheckSuccessSchema,
  abilityParamsSchema,
  KNOWN_ERRORS,
} from './schemas';

// declare const Lit: typeof LitNamespace;
declare const ethers: EthersType;

const { INSUFFICIENT_BALANCE } = KNOWN_ERRORS;


// Type annotation using 'any' to avoid complex internal type references
// The actual type is preserved at runtime and provides type safety when used
export const vincentAbility: any = createVincentAbility({
  packageName: '@lit-protocol/vincent-example-ability-native-send' as const,
  abilityParamsSchema: abilityParamsSchema,
  abilityDescription: 'Send native ETH to a recipient',
  supportedPolicies: supportedPoliciesForAbility([]),

  precheckSuccessSchema,
  precheckFailSchema,

  executeSuccessSchema,
  executeFailSchema,

  precheck: async ({ abilityParams }, { fail, succeed, delegation }) => {
    const { rpcUrl, amount, to } = abilityParams;
    const { ethAddress: delegatorAddress } = delegation.delegatorPkpInfo;

    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    const accountBalance = await provider.getBalance(delegatorAddress);
    if (accountBalance.lt(ethers.utils.parseEther(amount))) {
      return fail({
        error: `Delegator (${delegatorAddress} does not have enough tokens to send ${amount} to ${to}`,
        reason: INSUFFICIENT_BALANCE,
      });
    }

    return succeed({ availableBalance: accountBalance.toString() });
  },

  execute: async ({ abilityParams }, { succeed, fail, delegation, policiesContext }) => {
    try {
      const { to, amount, rpcUrl } = abilityParams;

      console.log(
        '[@lit-protocol/vincent-example-ability-native-send/execute] Executing Native Send Tool',
        {
          to,
          amount,
          rpcUrl,
        },
      );

      // Get provider - use provided RPC URL or default to Yellowstone
      const finalRpcUrl = rpcUrl || 'https://yellowstone-rpc.litprotocol.com/';
      const provider = new ethers.providers.JsonRpcProvider(finalRpcUrl);

      console.log(
        '[@lit-protocol/vincent-example-ability-native-send/execute] Using RPC URL:',
        finalRpcUrl,
      );

      // Get PKP's public key from the delegation context to use while composing a signed tx
      const pkpPublicKey = delegation.delegatorPkpInfo.publicKey;

      // Execute the native send transaction
      const txHash = await laUtils.transaction.handler.nativeSend({
        provider,
        pkpPublicKey,
        amount,
        to,
      });

      console.log(
        '[@lit-protocol/vincent-example-ability-native-send/execute] Native send successful',
        {
          txHash,
          to,
          amount,
        },
      );

      return succeed({
        txHash,
        to,
        amount,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error(
        '[@lit-protocol/vincent-example-ability-native-send/execute] Native send failed',
        error,
      );

      return fail({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  },
});
