import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('mcserverstatus')
    .setDescription('Checks the status of a Minecraft server')
    .addStringOption(option =>
      option
        .setName('address')
        .setDescription('Server IP or domain (e.g. play.example.com)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const address = interaction.options.getString('address');

    await interaction.deferReply();

    try {
      const res = await fetch(
        `https://api.mcsrvstat.us/3/${encodeURIComponent(address)}`
      );
      const data = await res.json();

      if (!data.online) {
        const offlineEmbed = new EmbedBuilder()
          .setTitle('Minecraft Server Status')
          .setDescription(`**${address}** is currently offline or unreachable.`)
          .setColor('#ED4245')
          .setTimestamp();

        await interaction.editReply({ embeds: [offlineEmbed] });
        return;
      }

      const decodeHtmlEntities = str =>
        str
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#0?39;/g, "'");

      const players = data.players || {};
      const onlineCount = players.online ?? 0;
      const maxCount = players.max ?? '?';
      const hasPlayerList = players.list && players.list.length > 0;
      const playerList = hasPlayerList
        ? players.list
            .slice(0, 20)
            .map(p => decodeHtmlEntities(p.name || p))
            .join(', ')
        : 'Player list not available for this server';

      const embed = new EmbedBuilder()
        .setTitle('Minecraft Server Status')
        .setColor('#57F287')
        .addFields(
          { name: 'Address', value: address, inline: true },
          { name: 'Status', value: 'Online', inline: true },
          { name: 'Version', value: data.version || 'Unknown', inline: true },
          {
            name: 'Players',
            value: `${onlineCount}/${maxCount}`,
            inline: true,
          },
          { name: 'Player List', value: playerList }
        )
        .setTimestamp();

      if (data.motd?.clean?.length) {
        embed.setDescription(
          data.motd.clean.map(decodeHtmlEntities).join('\n')
        );
      }

      const files = [];

      if (data.icon) {
        // mcsrvstat returns the icon as a base64 data URI, e.g. "data:image/png;base64,...."
        // Discord embeds can't use data URIs directly — they need a real URL or an attachment.
        const base64Data = data.icon.split(',')[1];
        if (base64Data) {
          const iconBuffer = Buffer.from(base64Data, 'base64');
          const attachment = new AttachmentBuilder(iconBuffer, {
            name: 'server-icon.png',
          });
          files.push(attachment);
          embed.setThumbnail('attachment://server-icon.png');
        }
      }

      await interaction.editReply({ embeds: [embed], files });
    } catch (error) {
      console.error('[mcserverstatus] Error fetching server status:', error);
      await interaction.editReply(
        'OI YA BLOODY TWAT, ENTER THE CORRECT SERVER IP YA WANKER!'
      );
    }
  },
};
