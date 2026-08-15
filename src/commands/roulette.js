import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('roulette')
    .setDescription('Randomly selects a member and times them out for 1 minute.'),

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

    const members = Array.from(eligibleMembers.values());
    const selected = members[Math.floor(Math.random() * members.length)];

    try {
      await selected.timeout(60 * 1000, 'Russian Roulette');

      const embed = new EmbedBuilder()
        .setTitle('🔫 Russian Roulette')
        .setDescription(
          `💀 **${selected.user.tag}** has been selected!\n\n` +
          `⏱️ Timeout: **1 minute**`
        )
        .setColor('#ED4245')
        .setThumbnail(selected.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: 'TitanBot • Russian Roulette' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Roulette error:', error);

      await interaction.reply({
        content:
          `❌ I couldn't timeout **${selected.user.tag}**.\n\n` +
          `Make sure TitanBot has **Moderate Members** permission and its role is above the selected member.`,
        ephemeral: true,
      });
    }
  },
};
