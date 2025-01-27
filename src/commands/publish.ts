import type { Command } from 'commander'
import path from 'path'
import fs from 'fs'
import { Logger } from '../services/console'
import { validateAndReadManifest } from '../services/manifest'
import { MAMORU_EXPLORER_URL, OUT_DIR, WASM_INDEX } from '../services/constants'
import queryManifest from '../services/query-manifest'
import ValidationChainService from '../services/validation-chain'
import { prepareBinaryFile } from '../services/assemblyscript'
import { Manifest } from '../types'
import colors from 'colors'
import short from 'short-uuid'

const translator = short()

export interface PublishOptions {
    rpc?: string
    privateKey: string
    gas?: string
}

async function publish(
    program: Command,
    projectPath: string,
    options: PublishOptions
) {
    const verbosity = program.opts().verbose
    const logger = new Logger(verbosity)

    const buildPath = path.join(projectPath, OUT_DIR)

    logger.ok('Validating Query manifest')
    const manifest = validateAndReadManifest(logger, program, projectPath)
    validateBuildPath(program, buildPath, manifest)

    logger.ok('Publishing to Validation chain')
    const vcService = new ValidationChainService(
        options.rpc,
        options.privateKey,
        logger
    )

    let daemonMetadataId = ''

    if (manifest.type === 'sql') {
        const queries = queryManifest.getQueries(logger, projectPath)
        const r = await vcService.registerDaemonMetadata(manifest, queries)
        daemonMetadataId = r.daemonMetadataId
    }

    if (manifest.type === 'wasm') {
        const wasm = prepareBinaryFile(path.join(buildPath, WASM_INDEX))
        const r = await vcService.registerDaemonMetadata(
            manifest,
            [],
            wasm,
            options.gas
        )
        daemonMetadataId = r.daemonMetadataId
    }

    if (!manifest.subscribable) {
        logger.ok('Registering Daemon to Validation chain')
        const r = await vcService.registerDaemonFromManifest(
            manifest,
            daemonMetadataId
        )

        logger.log(
            `Daemon registered successfully 🎉

    ℹ️  Metadata ShortUUID: 

        ${colors.magenta(translator.fromUUID(daemonMetadataId))}
    
    ℹ️  Metadata UUID: 

        ${colors.magenta(daemonMetadataId)}

    ℹ️  Daemon ShortUUID: 

        ${colors.magenta(translator.fromUUID(r.daemonId))}

    ℹ️  Daemon UUID: 

        ${colors.magenta(r.daemonId)}

    ℹ️  Explorer Url (it may take a few seconds to become available):

        ${colors.underline.blue(
            `${MAMORU_EXPLORER_URL}/explorer/${daemonMetadataId}`
        )}`
        )

        return {
            daemonMetadataId,
            daemonId: r.daemonId,
        }
    } else {
        logger.log(
            `DaemonMetadata registered successfully 🎉

    ℹ️  DaemonMetadata (template) ShortUUID: 

        ${colors.magenta(translator.fromUUID(daemonMetadataId))}

    ℹ️  DaemonMetadata (template) UUID: 

        ${colors.magenta(daemonMetadataId)}

    ℹ️  Explorer Url (it may take a few seconds to become available):

        ${colors.underline.blue(
            `${MAMORU_EXPLORER_URL}/explorer/${daemonMetadataId}`
        )}`
        )
    }
    logger.ok('Published successfully')

    return {
        daemonMetadataId,
    }
}

function validateBuildPath(
    program: Command,
    buildPath: string,
    manifest: Manifest
): void {
    if (manifest.type === 'sql') return
    if (!fs.existsSync(buildPath))
        program.error(
            'Project is not compiled, compile it first, use "mamoru-cli build"'
        )
}

export default {
    publish,
}
