import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('18kenmorestreet')
    .setDescription('Displays an image'),

  async execute(interaction) {
    const imageUrl = 'https://cdn.discordapp.com/attachments/1424259038249615390/1538036834066759710/18_kenmore_st_evil.png?ex=6a8137ec&is=6a7fe66c&hm=4f875ef809a3c474dc2747ab7c7833bd062f1387e3b45683466bcdbebe09a8b8&';

    const embed = new EmbedBuilder()
      .setImage(imageUrl);

    await interaction.reply({ embeds: [embed] });
  },
};
