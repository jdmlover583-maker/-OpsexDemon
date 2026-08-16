import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

// Adjust these to change the range of possible timeout durations (in seconds)
const MIN_TIMEOUT_SECONDS = 5;
const MAX_TIMEOUT_SECONDS = 28 * 24 * 60 * 60; // 28 days — Discord's hard cap on timeouts

function formatDuration(totalSeconds) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds) parts.push(`${seconds}s`);

  return parts.length ? parts.join(' ') : '0s';
}

export default {
  data: new SlashCommandBuilder()
    .setName('roulette')
    .setDescription('Randomly selects a member and times them out for a random duration.'),
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

    // Pick a random duration between MIN and MAX (inclusive), in seconds
    const timeoutSeconds =
      Math.floor(Math.random() * (MAX_TIMEOUT_SECONDS - MIN_TIMEOUT_SECONDS + 1)) +
      MIN_TIMEOUT_SECONDS;
    const timeoutMs = timeoutSeconds * 1000;

    try {
      await selected.timeout(timeoutMs, 'Russian Roulette');
      const embed = new EmbedBuilder()
        .setTitle('🔫 Russian Roulette')
        .setDescription(
          `💀 **${selected.user.tag}** has been selected!\n\n` +
          `⏱️ Timeout: **${formatDuration(timeoutSeconds)}**`
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
