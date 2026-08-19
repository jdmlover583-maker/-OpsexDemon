import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const LOVER_ROLE_ID = '1522175307904192612'; // 18 kenmore lover
const HATER_ROLE_ID = '1491345959626735646'; // 18 kenmore haters

export default {
  data: new SlashCommandBuilder()
    .setName('lovehateroulette')
    .setDescription(
      'Randomly picks a server member as an 18 Kenmore lover or hater'
    ),

  async execute(interaction) {
    await interaction.deferReply();

    // Make sure the member cache is fully populated (requires GuildMembers intent)
    await interaction.guild.members.fetch();

    const eligibleMembers = interaction.guild.members.cache.filter(
      m => !m.user.bot
    );

    if (eligibleMembers.size === 0) {
      await interaction.editReply(
        'No eligible members found to spin the wheel on.'
      );
      return;
    }

    const membersArray = [...eligibleMembers.values()];
    const member =
      membersArray[Math.floor(Math.random() * membersArray.length)];

    const isLover = Math.random() < 0.5;
    const resultRoleId = isLover ? LOVER_ROLE_ID : HATER_ROLE_ID;
    const removeRoleId = isLover ? HATER_ROLE_ID : LOVER_ROLE_ID;

    try {
      if (member.roles.cache.has(removeRoleId)) {
        await member.roles.remove(removeRoleId);
      }

      if (!member.roles.cache.has(resultRoleId)) {
        await member.roles.add(resultRoleId);
      }

      const embed = new EmbedBuilder()
        .setTitle('18 Kenmore Love/Hate Roulette')
        .setDescription(
          isLover
            ? `The wheel has spoken... ${member} is now officially an **18 Kenmore Lover**! 💚`
            : `The wheel has spoken... ${member} is now officially an **18 Kenmore Hater**! 💔`
        )
        .setColor(isLover ? '#57F287' : '#ED4245')
        .setThumbnail(member.displayAvatarURL({ size: 256 }))
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[lovehateroulette] Failed to update roles:', error);
      await interaction.editReply(
        "Something went wrong assigning the role. Make sure the bot's role is positioned above both the lover and hater roles in Server Settings > Roles."
      );
    }
  },
};
