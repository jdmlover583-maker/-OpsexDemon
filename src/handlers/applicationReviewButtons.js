import { EmbedBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { createEmbed } from '../utils/embeds.js';
import { getApplicationStatusColor } from '../config/bot.js';
import { logger } from '../utils/logger.js';
import { handleInteractionError, replyUserError, ErrorTypes } from '../utils/errorHandler.js';
import { InteractionHelper } from '../utils/interactionHelper.js';
import ApplicationService from '../services/applicationService.js';
import { getApplication, getApplicationSettings } from '../utils/database.js';

function getApplicationStatusPresentation(statusValue) {
  const normalized = typeof statusValue === 'string' ? statusValue.trim().toLowerCase() : 'unknown';
  const statusLabel =
    normalized === 'pending' ? 'In Progress' :
    normalized === 'approved' ? 'Accepted' :
    normalized === 'denied' ? 'Denied' :
    'Unknown';
  const statusEmoji =
    normalized === 'pending' ? '🟡' :
    normalized === 'approved' ? '🟢' :
    normalized === 'denied' ? '🔴' :
    '⚪';

  return { normalized, statusLabel, statusEmoji };
}

async function handleApplicationReviewButton(interaction, client, args) {
  const [action, appId] = args;

  try {
    if (!interaction.inGuild()) {
      return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'This button can only be used in a server.' });
    }

    if (!['approve', 'deny'].includes(action)) {
      return await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: 'Unknown review action.' });
    }

    await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });

    const settings = await getApplicationSettings(client, interaction.guild.id);
    const isManager =
      interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) ||
      (settings.managerRoles && settings.managerRoles.some((roleId) => interaction.member.roles.cache.has(roleId)));

    if (!isManager) {
      return await replyUserError(interaction, { type: ErrorTypes.PERMISSION, message: 'You do not have permission to review applications.' });
    }

    const application = await getApplication(client, interaction.guild.id, appId);
    if (!application) {
      return await replyUserError(interaction, { type: ErrorTypes.USER_INPUT, message: 'Application not found. It may have already been removed.' });
    }

    if (application.status !== 'pending') {
      return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'This application has already been reviewed.' });
    }

    await ApplicationService.reviewApplication(client, interaction.guild.id, appId, {
      action,
      reason: 'No reason provided.',
      reviewerId: interaction.user.id,
    });

    const status = action === 'approve' ? 'approved' : 'denied';
    const statusView = getApplicationStatusPresentation(status);
    const statusColor = getApplicationStatusColor(status);

    // Update the persistent review message: swap color, mark status, drop buttons
    try {
      const originalEmbed = interaction.message.embeds[0];
      if (originalEmbed) {
        const updatedEmbed = EmbedBuilder.from(originalEmbed)
          .setColor(statusColor)
          .setTitle(`${statusView.statusEmoji} Application ${statusView.statusLabel}`)
          .addFields({ name: 'Reviewed by', value: `<@${interaction.user.id}>`, inline: true });

        await interaction.message.edit({ embeds: [updatedEmbed], components: [] });
      } else {
        await interaction.message.edit({ components: [] });
      }
    } catch (error) {
      logger.warn('Failed to update application review message after decision', {
        error: error.message,
        applicationId: appId,
      });
    }

    // DM the applicant
    try {
      const user = await client.users.fetch(application.userId);
      const dmEmbed = createEmbed({
        title: `${statusView.statusEmoji} Application ${statusView.statusLabel}`,
        description:
          `Your application for **${application.roleName}** has been **${status}**.\n\n` +
          `Use \`/apply status id:${appId}\` to view details.`,
      }).setColor(statusColor);

      await user.send({ embeds: [dmEmbed] });
    } catch (error) {
      logger.warn('Failed to DM applicant about review decision', {
        error: error.message,
        userId: application.userId,
        applicationId: appId,
      });
    }

    // Assign role on approval
    if (action === 'approve') {
      try {
        const member = await interaction.guild.members.fetch(application.userId);
        await member.roles.add(application.roleId);
      } catch (error) {
        logger.error('Failed to assign role to approved applicant', {
          error: error.message,
          userId: application.userId,
          roleId: application.roleId,
          applicationId: appId,
        });
      }
    }

    await InteractionHelper.safeEditReply(interaction, {
      embeds: [
        createEmbed({
          title: `Application ${statusView.statusLabel}`,
          description: `You **${status}** the application from <@${application.userId}>.`,
          color: status === 'approved' ? 'success' : 'error',
        }),
      ],
    });
  } catch (error) {
    logger.error('Error handling application review button', {
      error: error.message,
      customId: interaction.customId,
      guildId: interaction.guild?.id,
    });

    await handleInteractionError(interaction, error, {
      type: 'button',
      handler: 'application_review',
      customId: interaction.customId,
    });
  }
}

export default {
  name: 'app_review',
  execute: handleApplicationReviewButton,
};
