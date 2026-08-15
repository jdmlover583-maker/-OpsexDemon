import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('roulette')
    .setDescription('Randomly selects a server member and times them out for 1 minute.'),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true,
      });
    }

    const eligibleMembers = interaction.guild.members.cache.filter(
      member =>
        !member.user.bot &&
        member.id !== interaction.client.user.id &&
        member.moderatable
    );

    if (eligibleMembers.size === 0) {
      return interaction.reply({
        content: 'There are no eligible members to select.',
        ephemeral: true,
      });
    }

    const selected = eligibleMembers.random();

    try {
      await selected.timeout(60_000, 'Russian Roulette');

      const embed = new EmbedBuilder()
        .setTitle('🔫 Russian Roulette')
        .setDescription(
          `💀 **${selected.user.tag}** has been selected!\n\n` +
          `⏱️ **Timeout:** 1 minute`
        )
        .setColor('#ED4245')
        .setThumbnail(selected.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: 'TitanBot • Russian Roulette' })
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
      });
    } catch (error) {
      console.error('Russian Roulette error:', error);

      if (!interaction.replied) {
        await interaction.reply({
          content:
            `I couldn't timeout **${selected.user.tag}**. ` +
            `Make sure TitanBot has **Moderate Members** permission and its role is above the selected member.`,
          ephemeral: true,
        });
      }
    }
  },
};import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('roulette')
    .setDescription('Randomly selects a server member and times them out for 1 minute.'),

  async execute(interaction) {
    // Make sure the command is being used in a server
    if (!interaction.guild) {
      return interaction.reply({
        content: '❌ This command can only be used in a server.',
        ephemeral: true,
      });
    }

    // Get eligible members
    const eligibleMembers = interaction.guild.members.cache.filter(
      member =>
        !member.user.bot &&
        member.id !== interaction.client.user.id &&
        member.moderatable
    );

    // Make sure there is someone to select
    if (eligibleMembers.size === 0) {
      return interaction.reply({
        content: '❌ There are no eligible members to select.',
        ephemeral: true,
      });
    }

    // Pick a random member
    const selected = eligibleMembers.random();

    try {
      // Timeout for 60 seconds
      await selected.timeout(60_000, 'Russian Roulette');

      const embed = new EmbedBuilder()
        .setTitle('🔫 Russian Roulette')
        .setDescription(
          `💀 **${selected.user.tag}** has been selected!\n\n` +
          `⏱️ **Timeout:** 1 minute`
        )
        .setColor('#ED4245')
        .setThumbnail(selected.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: 'TitanBot • Russian Roulette' })
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
      });

    } catch (error) {
      console.error('Russian Roulette error:', error);

      await interaction.reply({
        content: `❌ I couldn't timeout **${selected.user.tag}**. Make sure TitanBot has **Moderate Members** permission and its role is higher than the selected member's role.`,
        ephemeral: true,
      });
    }
  },
};
