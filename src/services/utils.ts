import { Chain_ChainType } from '@mamoru-ai/validation-chain-ts-client/dist/validationchain.validationchain/types/validationchain/validationchain/chain'
import joi from 'joi'

export function formatJoiError(error: joi.ValidationError): string {
    const formattedExplanation = error.details
        .map((error, index) => {
            return `${index + 1}. ${error.context.message || error.message}`
        })
        .join('\n')

    return `manifest contains invalid structure.\nErrors:\n${formattedExplanation}`
}

export function getAvailableChains(): Chain_ChainType[] {
    return Object.keys(Chain_ChainType).filter(
        (x) => !(parseInt(x) >= -1 || x == 'UNRECOGNIZED' || x == 'SUI_DEVNET')
    ) as unknown as Chain_ChainType[]
}

export function getNotSupportedChains(): Chain_ChainType[] {
    return Object.keys(Chain_ChainType).filter(
        (x) => parseInt(x) == 0 || x == 'SUI_DEVNET'
    ) as unknown as Chain_ChainType[]
}
