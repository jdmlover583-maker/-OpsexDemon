import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const ANNOUNCEMENT_CHANNEL_ID = '1488075129027039273';

export default {
  data: new SlashCommandBuilder()
    .setName('deathcountdown')
    .setDescription('Shows a completely fictional random death countdown.'),

  async execute(interaction) {
    const MIN_SECONDS = 30;
    const MAX_SECONDS = Math.floor(100 * 365.25 * 24 * 60 * 60);

    let remaining =
      Math.floor(Math.random() * (MAX_SECONDS - MIN_SECONDS + 1)) +
      MIN_SECONDS;

    const formatTime = totalSeconds => {
      let seconds = Math.floor(totalSeconds);

      const years = Math.floor(seconds / (365.25 * 24 * 60 * 60));
      seconds %= Math.floor(365.25 * 24 * 60 * 60);

      const days = Math.floor(seconds / 86400);
      seconds %= 86400;

      const hours = Math.floor(seconds / 3600);
      seconds %= 3600;

      const minutes = Math.floor(seconds / 60);
      seconds %= 60;

      const parts = [];

      if (years) parts.push(`${years}y`);
      if (days) parts.push(`${days}d`);
      if (hours) parts.push(`${hours}h`);
      if (minutes) parts.push(`${minutes}m`);
      if (seconds || parts.length === 0) parts.push(`${seconds}s`);

      return parts.join(' ');
    };

    const createEmbed = () =>
      new EmbedBuilder()
        .setTitle('☠️ DEATH COUNTDOWN')
        .setDescription(
          `**${interaction.user.tag}**\n\n` +
          `💀 Your completely fictional death is in:\n\n` +
          `# ⏳ ${formatTime(remaining)}\n\n` +
          `*This countdown is completely random and fictional.*`
        )
        .setColor('#ED4245')
        .setThumbnail(
          interaction.user.displayAvatarURL({ size: 256 })
        )
        .setFooter({
          text: 'TitanBot • Completely Fake Countdown',
        })
        .setTimestamp();

    await interaction.reply({
      embeds: [createEmbed()],
    });

    const message = await interaction.fetchReply();

    const timer = setInterval(async () => {
      remaining--;

      if (remaining <= 0) {
        clearInterval(timer);

        // Update the original countdown message
        await message.edit({
          embeds: [
            new EmbedBuilder()
              .setTitle('💀 DEATH COUNTDOWN')
              .setDescription(
                `**${interaction.user.tag}**\n\n` +
                `# ☠️ TIME'S UP\n\n` +
                `Your completely fictional countdown has reached zero.`
              )
              .setColor('#000000')
              .setThumbnail(
                interaction.user.displayAvatarURL({ size: 256 })
              )
              .setFooter({
                text: 'TitanBot • It was fake',
              })
              .setTimestamp(),
          ],
        }).catch(() => {});

        // Send announcement
        try {
          const announcementChannel =
            await interaction.client.channels.fetch(
              ANNOUNCEMENT_CHANNEL_ID
            );

          if (announcementChannel?.isTextBased()) {
            await announcementChannel.send({
              content: `<@${interaction.user.id}>, your time is up!`,
              allowedMentions: {
                users: [interaction.user.id],
              },
            });
          }
        } catch (error) {
          console.error(
            '[DeathCountdown] Failed to send announcement:',
            error
          );
        }

        return;
      }

      await message.edit({
        embeds: [createEmbed()],
      }).catch(() => {
        clearInterval(timer);
      });
    }, 1000);
  },
};
