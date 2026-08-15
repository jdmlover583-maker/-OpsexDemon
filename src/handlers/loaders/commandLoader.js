import fs from 'fs/promises';
import path from 'path';
import {
  fileURLToPath,
  pathToFileURL,
} from 'url';

import { Collection } from 'discord.js';

import { logger } from '../../utils/logger.js';
import botConfig from '../../config/bot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_COMMANDS = 100;
const COMMAND_COUNT_WARN_THRESHOLD = 90;


// ============================================================
// SUBCOMMAND HELPERS
// ============================================================

function getSubcommandInfo(commandData) {
  const subcommands = [];

  if (!commandData.options) {
    return subcommands;
  }

  for (const option of commandData.options) {

    // Subcommand
    if (option.type === 1) {
      subcommands.push(option.name);
    }

    // Subcommand group
    else if (option.type === 2) {

      if (!option.options) {
        continue;
      }

      for (const subOption of option.options) {

        if (subOption.type === 1) {
          subcommands.push(
            `${option.name}/${subOption.name}`
          );
        }
      }
    }
  }

  return subcommands;
}


// ============================================================
// RECURSIVE FILE LOADER
// ============================================================

async function getAllFiles(
  directory,
  fileList = []
) {

  const files =
    await fs.readdir(
      directory,
      {
        withFileTypes: true,
      }
    );


  for (const file of files) {

    const filePath =
      path.join(
        directory,
        file.name
      );


    if (file.isDirectory()) {

      // Don't load module internals as commands.
      if (file.name === 'modules') {
        continue;
      }

      await getAllFiles(
        filePath,
        fileList
      );

    } else if (
      file.name.endsWith('.js')
    ) {

      fileList.push(
        filePath
      );
    }
  }


  return fileList;
}


// ============================================================
// LOAD COMMANDS
// ============================================================

export async function loadCommands(client) {

  client.commands =
    new Collection();


  const commandsPath =
    path.join(
      __dirname,
      '../../commands'
    );


  const commandFiles =
    await getAllFiles(
      commandsPath
    );


  logger.info(
    `Found ${commandFiles.length} command files to load`
  );


  const uniqueCommandNames =
    new Set();


  for (
    const filePath
    of commandFiles
  ) {

    try {

      const normalizedPath =
        filePath.replace(
          /\\/g,
          '/'
        );


      const commandModule =
        await import(
          pathToFileURL(
            filePath
          ).href
        );


      const command =
        commandModule.default ||
        commandModule;


      if (
        !command.data ||
        !command.execute
      ) {

        logger.warn(
          `Command at ${filePath} is missing ` +
          `required "data" or "execute" property.`
        );

        continue;
      }


      const commandName =
        command.data.name;


      const commandDir =
        path.dirname(
          filePath
        );


      const category =
        path.basename(
          commandDir
        );


      command.category =
        category;

      command.filePath =
        normalizedPath;


      // ------------------------------------------------------
      // DUPLICATE PROTECTION
      // ------------------------------------------------------

      if (
        uniqueCommandNames.has(
          commandName
        )
      ) {

        logger.warn(
          `Duplicate command "${commandName}" ` +
          `found at ${normalizedPath}; skipping duplicate.`
        );

        continue;
      }


      uniqueCommandNames.add(
        commandName
      );


      client.commands.set(
        commandName,
        command
      );


      // ------------------------------------------------------
      // LOG COMMAND
      // ------------------------------------------------------

      logger.info(
        `Loaded command: ${commandName} ` +
        `from ${normalizedPath} ` +
        `(category: ${category})`
      );


      const subcommands =
        getSubcommandInfo(
          command.data.toJSON()
        );


      if (
        subcommands.length > 0
      ) {

        logger.info(
          `  - Subcommands: ` +
          `${subcommands.join(', ')}`
        );
      }


    } catch (error) {

      logger.error(
        `Error loading command from ${filePath}:`,
        error
      );
    }
  }


  // ----------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------

  const uniqueCommands =
    new Set();


  for (
    const [
      name,
      command
    ]
    of client.commands
  ) {

    if (
      command.data &&
      command.data.name
    ) {

      uniqueCommands.add(
        command.data.name
      );
    }
  }


  logger.info(
    `Loaded ${uniqueCommands.size} commands`
  );


  return client.commands;
}


// ============================================================
// COMMAND PAYLOADS
// ============================================================

function collectCommandPayloads(
  client
) {

  const commands = [];

  let totalSubcommands = 0;

  const registeredNames =
    new Set();


  for (
    const command
    of client.commands.values()
  ) {

    if (
      !command.data ||
      typeof command.data.toJSON !== 'function'
    ) {

      logger.warn(
        `Command missing data or toJSON method: ${command}`
      );

      continue;
    }


    const commandName =
      command.data.name;


    if (
      registeredNames.has(
        commandName
      )
    ) {

      logger.debug(
        `Skipping duplicate command: ${commandName}`
      );

      continue;
    }


    registeredNames.add(
      commandName
    );


    const commandJson =
      command.data.toJSON();


    commands.push(
      commandJson
    );


    totalSubcommands +=
      getSubcommandInfo(
        commandJson
      ).length;


    if (
      process.env.NODE_ENV !== 'production'
    ) {

      logger.debug(
        `Registering command: ${commandName}`
      );
    }
  }


  return {
    commands,
    totalSubcommands,
  };
}


// ============================================================
// VALIDATION
// ============================================================

function validateCommands(
  commands
) {

  const validationErrors = [];


  for (
    const cmd
    of commands
  ) {

    if (
      cmd.name &&
      cmd.name.length > 32
    ) {

      validationErrors.push(
        `Command ${cmd.name} has name longer than 32 chars`
      );
    }


    if (
      cmd.description &&
      cmd.description.length > 110
    ) {

      validationErrors.push(
        `Command ${cmd.name} has description longer than 110 chars`
      );
    }


    if (!cmd.options) {
      continue;
    }


    for (
      const option
      of cmd.options
    ) {

      if (
        option.name &&
        option.name.length > 32
      ) {

        validationErrors.push(
          `Command ${cmd.name} option ${option.name} ` +
          `has name longer than 32 chars`
        );
      }


      if (
        option.description &&
        option.description.length > 110
      ) {

        validationErrors.push(
          `Command ${cmd.name} option ${option.name} ` +
          `has description longer than 110 chars`
        );
      }


      if (option.choices) {

        for (
          const choice
          of option.choices
        ) {

          if (
            choice.name &&
            choice.name.length > 110
          ) {

            validationErrors.push(
              `Command ${cmd.name} option ${option.name} ` +
              `choice ${choice.name} has name longer than 110 chars`
            );
          }


          if (
            typeof choice.value === 'string' &&
            choice.value.length > 100
          ) {

            validationErrors.push(
              `Command ${cmd.name} option ${option.name} ` +
              `choice ${choice.name} has value longer than 100 chars`
            );
          }
        }
      }


      if (!option.options) {
        continue;
      }


      for (
        const subOption
        of option.options
      ) {

        if (
          subOption.name &&
          subOption.name.length > 32
        ) {

          validationErrors.push(
            `Command ${cmd.name} subcommand ${option.name} ` +
            `option ${subOption.name} has name longer than 32 chars`
          );
        }


        if (
          subOption.description &&
          subOption.description.length > 110
        ) {

          validationErrors.push(
            `Command ${cmd.name} subcommand ${option.name} ` +
            `option ${subOption.name} has description longer than 110 chars`
          );
        }


        if (!subOption.choices) {
          continue;
        }


        for (
          const choice
          of subOption.choices
        ) {

          if (
            choice.name &&
            choice.name.length > 110
          ) {

            validationErrors.push(
              `Command ${cmd.name} subcommand ${option.name} ` +
              `option ${subOption.name} choice ${choice.name} ` +
              `has name longer than 110 chars`
            );
          }


          if (
            typeof choice.value === 'string' &&
            choice.value.length > 100
          ) {

            validationErrors.push(
              `Command ${cmd.name} subcommand ${option.name} ` +
              `option ${subOption.name} choice ${choice.name} ` +
              `has value longer than 100 chars`
            );
          }
        }
      }
    }
  }


  if (
    validationErrors.length > 0
  ) {

    logger.error(
      'Command validation failed. Errors:'
    );


    validationErrors.forEach(
      error =>
        logger.error(
          `  - ${error}`
        )
    );


    throw new Error(
      `Command validation failed with ` +
      `${validationErrors.length} errors`
    );
  }
}


// ============================================================
// COMMAND LIMIT
// ============================================================

function prepareCommandsForRegistration(
  commands
) {

  if (
    commands.length >=
    COMMAND_COUNT_WARN_THRESHOLD
  ) {

    logger.warn(
      `Command count (${commands.length}) is near ` +
      `Discord's ${MAX_COMMANDS} global command limit`
    );
  }


  if (
    commands.length <= MAX_COMMANDS
  ) {

    return commands;
  }


  logger.warn(
    `Command count (${commands.length}) exceeds ` +
    `Discord limit (${MAX_COMMANDS}), truncating...`
  );


  const truncated =
    commands.slice(
      0,
      MAX_COMMANDS
    );


  logger.info(
    `Truncated to ${truncated.length} commands for registration`
  );


  return truncated;
}


// ============================================================
// REGISTER GUILD COMMANDS
// ============================================================

async function registerGuildCommands(
  client,
  clientId,
  guildId,
  commands,
  totalSubcommands
) {

  if (!clientId) {
    throw new Error(
      'CLIENT_ID is required for slash command registration'
    );
  }


  if (!guildId) {
    throw new Error(
      'GUILD_ID is required for guild slash command registration'
    );
  }


  if (!client.rest) {
    throw new Error(
      'Discord REST client is not available'
    );
  }


  logger.info(
    `Preparing to register ` +
    `${totalSubcommands + commands.length} ` +
    `commands to guild ${guildId}`
  );


  logger.info(
    'Validating commands before registration...'
  );


  validateCommands(
    commands
  );


  logger.info(
    'Command validation passed'
  );


  const commandsToRegister =
    prepareCommandsForRegistration(
      commands
    );


  const endpoint =
    `/applications/${clientId}/guilds/${guildId}/commands`;


  /*
   * PUT replaces the guild's current application-command
   * set with the commands supplied below.
   *
   * This is intentional and prevents stale commands from
   * remaining registered.
   */

  if (
    botConfig.commands?.deleteCommands
  ) {

    logger.info(
      `Clearing existing guild commands for ${guildId}...`
    );

    await client.rest.put(
      endpoint,
      {
        body: [],
      }
    );
  }


  logger.info(
    `Registering ${commandsToRegister.length} ` +
    `commands to guild ${guildId}...`
  );


  await client.rest.put(
    endpoint,
    {
      body: commandsToRegister,
    }
  );


  logger.info(
    `Successfully registered ` +
    `${commandsToRegister.length} commands ` +
    `to guild ${guildId}`
  );
}


// ============================================================
// REGISTER GLOBAL COMMANDS
// ============================================================

async function registerGlobalCommands(
  client,
  clientId,
  commands,
  totalSubcommands
) {

  if (!clientId) {
    throw new Error(
      'CLIENT_ID is required for slash command registration'
    );
  }


  if (!client.rest) {
    throw new Error(
      'Discord REST client is not available'
    );
  }


  logger.info(
    `Preparing to register ` +
    `${totalSubcommands + commands.length} ` +
    `commands globally`
  );


  logger.info(
    'Validating commands before registration...'
  );


  validateCommands(
    commands
  );


  logger.info(
    'Command validation passed'
  );


  const commandsToRegister =
    prepareCommandsForRegistration(
      commands
    );


  if (
    botConfig.commands?.deleteCommands
  ) {

    logger.info(
      'Clearing existing global commands before registration...'
    );


    await client.rest.put(
      `/applications/${clientId}/commands`,
      {
        body: [],
      }
    );
  }


  logger.info(
    `Registering ${commandsToRegister.length} global commands...`
  );


  await client.rest.put(
    `/applications/${clientId}/commands`,
    {
      body: commandsToRegister,
    }
  );


  logger.info(
    `Successfully registered ` +
    `${commandsToRegister.length} global commands`
  );


  logger.info(
    'Global commands may take some time to propagate'
  );
}


// ============================================================
// PUBLIC REGISTRATION FUNCTION
// ============================================================

export async function registerCommands(
  client,
  options = {}
) {

  const {
    clientId = null,
    guildId = null,
  } = options;


  try {

    const {
      commands,
      totalSubcommands,
    } =
      collectCommandPayloads(
        client
      );


    if (guildId) {

      await registerGuildCommands(
        client,
        clientId,
        guildId,
        commands,
        totalSubcommands
      );

    } else {

      await registerGlobalCommands(
        client,
        clientId,
        commands,
        totalSubcommands
      );
    }


  } catch (error) {

    logger.error(
      'Error registering commands:',
      error
    );

    throw error;
  }
}


// ============================================================
// RELOAD COMMAND
// ============================================================

export async function reloadCommand(
  client,
  commandName
) {

  const command =
    client.commands.get(
      commandName
    );


  if (!command) {

    return {
      success: false,

      message:
        `Command "${commandName}" not found`,
    };
  }


  try {

    const commandPath =
      path.resolve(
        command.filePath
      );


    const moduleUrl =
      pathToFileURL(
        commandPath
      );


    moduleUrl.searchParams.set(
      't',
      Date.now().toString()
    );


    const module =
      await import(
        moduleUrl.href
      );


    const newCommand =
      module.default ||
      module;


    client.commands.set(
      commandName,
      newCommand
    );


    logger.info(
      `Reloaded command: ${commandName}`
    );


    return {
      success: true,

      message:
        `Successfully reloaded command "${commandName}"`,
    };


  } catch (error) {

    logger.error(
      `Error reloading command "${commandName}":`,
      error
    );


    return {
      success: false,

      message:
        `Error reloading command: ${error.message}`,
    };
  }
}
