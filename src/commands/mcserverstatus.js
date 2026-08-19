import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

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

      const players = data.players || {};
      const onlineCount = players.online ?? 0;
      const maxCount = players.max ?? '?';
      const playerList =
        players.list && players.list.length > 0
          ? players.list
              .slice(0, 20)
              .map(p => p.name || p)
              .join(', ')
          : 'No players online';

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
        embed.setDescription(data.motd.clean.join('\n'));
      }

      if (data.icon) {
        // mcsrvstat returns a base64 data URI for the server icon
        embed.setThumbnail(data.icon);
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[mcserverstatus] Error fetching server status:', error);
      await interaction.editReply(
        'Something went wrong while checking that server. Double check the address and try again.'
      );
    }
  },
};
