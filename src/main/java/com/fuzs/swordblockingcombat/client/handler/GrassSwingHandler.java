package com.fuzs.swordblockingcombat.client.handler;

import com.fuzs.swordblockingcombat.SwordBlockingCombat;
import com.fuzs.swordblockingcombat.config.ConfigBuildHandler;
import com.fuzs.swordblockingcombat.config.ConfigBuildHandler.AttackIndicator;
import com.mojang.blaze3d.platform.GlStateManager;
import net.minecraft.client.GameSettings;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.AbstractGui;
import net.minecraft.client.settings.AttackIndicatorStatus;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntitySize;
import net.minecraft.entity.LivingEntity;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.item.UseAction;
import net.minecraft.util.HandSide;
import net.minecraft.util.ResourceLocation;
import net.minecraft.util.math.EntityRayTraceResult;
import net.minecraft.util.math.RayTraceContext;
import net.minecraft.util.math.RayTraceResult;
import net.minecraft.util.math.Vec3d;
import net.minecraft.world.GameType;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.api.distmarker.OnlyIn;
import net.minecraftforge.client.event.RenderGameOverlayEvent;
import net.minecraftforge.client.event.RenderSpecificHandEvent;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;

@OnlyIn(Dist.CLIENT)
public class GrassSwingHandler {

    private static final ResourceLocation GUI_ICONS_LOCATION = new ResourceLocation(SwordBlockingCombat.MODID, "textures/gui/icons.png");

    private final Minecraft mc = Minecraft.getInstance();
    private int leftClickCounter;
    private AttackIndicatorStatus attackIndicator = AttackIndicatorStatus.OFF;

    private static int objectMouseOverTimer;
    private static EntityRayTraceResult objectMouseOver;
    private static Entity pointedEntity;

    @SuppressWarnings("unused")
    @SubscribeEvent
    public void onRenderHand(final RenderSpecificHandEvent evt) {

        if (ConfigBuildHandler.HIDE_SHIELD.get() && this.mc.player != null && evt.getHand().equals(this.mc.player.getActiveHand())
                && this.mc.player.getActiveItemStack().getUseAction() == UseAction.BLOCK) {

            evt.setCanceled(true);
        }
    }

    @SuppressWarnings("unused")
    @SubscribeEvent
    public void onRenderGameOverlay(final RenderGameOverlayEvent evt) {

        boolean crosshair = evt.getType() == RenderGameOverlayEvent.ElementType.CROSSHAIRS && ConfigBuildHandler.SHIELD_INDICATOR.get() == AttackIndicator.CROSSHAIR;
        boolean hotbar = evt.getType() == RenderGameOverlayEvent.ElementType.HOTBAR && ConfigBuildHandler.SHIELD_INDICATOR.get() == AttackIndicator.HOTBAR;
        if (!crosshair && !hotbar || this.mc.player == null || this.mc.playerController == null || !this.mc.player.isActiveItemStackBlocking()
                || this.mc.playerController.getCurrentGameType() == GameType.SPECTATOR && !this.mc.ingameGUI.func_212913_a(this.mc.objectMouseOver)) {

            return;
        }

        GameSettings gamesettings = this.mc.gameSettings;
        if (crosshair && gamesettings.thirdPersonView == 0) {

            if (!gamesettings.showDebugInfo || gamesettings.hideGUI || this.mc.player.hasReducedDebug() || gamesettings.reducedDebugInfo) {

                if (evt instanceof RenderGameOverlayEvent.Pre) {

                    this.attackIndicator = gamesettings.attackIndicator;
                    gamesettings.attackIndicator = AttackIndicatorStatus.OFF;
                } else if (evt instanceof RenderGameOverlayEvent.Post) {

                    gamesettings.attackIndicator = this.attackIndicator;
                    this.mc.getTextureManager().bindTexture(GUI_ICONS_LOCATION);
                    GlStateManager.enableBlend();
                    GlStateManager.enableAlphaTest();
                    GlStateManager.blendFuncSeparate(GlStateManager.SourceFactor.ONE_MINUS_DST_COLOR, GlStateManager.DestFactor.ONE_MINUS_SRC_COLOR,
                            GlStateManager.SourceFactor.ONE, GlStateManager.DestFactor.ZERO);

                    int width = this.mc.mainWindow.getScaledWidth() / 2 - 8;
                    int height = this.mc.mainWindow.getScaledHeight() / 2 - 7 + 16;
                    // rendering on top of each other for transparency reasons
                    AbstractGui.blit(width, height, 36, 0, 16, 14, 256, 256);
                    AbstractGui.blit(width, height, 52, 0, 16, 14, 256, 256);
                }
            }
        }

        if (hotbar) {

            if (evt instanceof RenderGameOverlayEvent.Pre) {

                this.attackIndicator = gamesettings.attackIndicator;
                gamesettings.attackIndicator = AttackIndicatorStatus.OFF;
            } else if (evt instanceof RenderGameOverlayEvent.Post) {

                gamesettings.attackIndicator = this.attackIndicator;
                GlStateManager.enableRescaleNormal();
                GlStateManager.enableBlend();
                GlStateManager.blendFuncSeparate(GlStateManager.SourceFactor.SRC_ALPHA, GlStateManager.DestFactor.ONE_MINUS_SRC_ALPHA,
                        GlStateManager.SourceFactor.ONE, GlStateManager.DestFactor.ZERO);
                this.mc.getTextureManager().bindTexture(GUI_ICONS_LOCATION);
                GlStateManager.color4f(1.0F, 1.0F, 1.0F, 1.0F);

                int width = this.mc.mainWindow.getScaledWidth() / 2;
                int height = this.mc.mainWindow.getScaledHeight() - 20;
                width = this.mc.player.getPrimaryHand().opposite() == HandSide.RIGHT ? width - 91 - 22 : width + 91 + 6;
                AbstractGui.blit(width, height, 18, 0, 18, 18, 256, 256);

                GlStateManager.disableRescaleNormal();
                GlStateManager.disableBlend();
            }
        }
    }

    @SuppressWarnings("unused")
    @SubscribeEvent
    public void onClientTick(final TickEvent.ClientTickEvent evt) {

        if (ConfigBuildHandler.HOLD_ATTACK.get() && evt.phase == TickEvent.Phase.END) {

            if (this.leftClickCounter <= 0) {

                if (this.mc.gameSettings.keyBindAttack.isKeyDown() && this.mc.objectMouseOver != null && this.mc.objectMouseOver.getType() != RayTraceResult.Type.MISS) {

                    // same tick value for checking attack strength as in PlayerEntity#attackTargetEntityWithCurrentItem
                    if (ConfigBuildHandler.REMOVE_ATTACK_COOLDOWN.get() || this.mc.player != null && this.mc.player.getCooledAttackStrength(0.5F) == 1.0F) {

                        this.mc.clickMouse();
                        this.leftClickCounter = 10;
                    }
                }

            } else {

                this.leftClickCounter--;
            }
        }
    }

    public static double rayTraceCollidingBlocks(float partialTicks, Entity entity, double blockReachDistance) {

        RayTraceResult objectMouseOver = rayTraceBlocks(entity, blockReachDistance, partialTicks);
        Vec3d vec3d = entity.getEyePosition(partialTicks);

        return objectMouseOver.getHitVec().squareDistanceTo(vec3d);
    }

    private static RayTraceResult rayTraceBlocks(Entity entity, double blockReachDistance, float partialTicks) {

        // uses collider block mode instead of outline
        Vec3d vec3d = entity.getEyePosition(partialTicks);
        Vec3d vec3d1 = entity.getLook(partialTicks);
        Vec3d vec3d2 = vec3d.add(vec3d1.x * blockReachDistance, vec3d1.y * blockReachDistance, vec3d1.z * blockReachDistance);
        return entity.world.rayTraceBlocks(new RayTraceContext(vec3d, vec3d2, RayTraceContext.BlockMode.COLLIDER, RayTraceContext.FluidMode.NONE, entity));
    }

    public static void applyCoyoteTime() {

        final Minecraft mc = Minecraft.getInstance();
        if (mc.objectMouseOver != null && mc.objectMouseOver.getType() == RayTraceResult.Type.ENTITY) {

            Entity entity = ((EntityRayTraceResult) mc.objectMouseOver).getEntity();
            EntitySize size = entity.getSize(entity.getPose());
            if ((!ConfigBuildHandler.COYOTE_SMALL.get() || size.width * size.width * size.height < 1.0F) && entity.isAlive()) {

                objectMouseOver = (EntityRayTraceResult) mc.objectMouseOver;
                objectMouseOverTimer = ConfigBuildHandler.COYOTE_TIME.get();
                pointedEntity = mc.pointedEntity;
            }
        } else if (objectMouseOverTimer > 0 && objectMouseOver.getEntity().isAlive()) {

            mc.objectMouseOver = objectMouseOver;
            mc.pointedEntity = pointedEntity;
            objectMouseOverTimer--;
        }
    }

    public static float getSwingProgress(float swingProgress, LivingEntity entity, float partialTickTime) {

        float cooldown = 1.0F;
        if (entity instanceof PlayerEntity) {

            cooldown = ((PlayerEntity) entity).getCooledAttackStrength(partialTickTime);
        }

        return ((swingProgress > 0.4F) && ((ConfigBuildHandler.REMOVE_ATTACK_COOLDOWN.get() ? swingProgress : cooldown) < 0.95F)) ?
                (0.4F + (0.6F * (float) Math.pow((swingProgress - 0.4F) / 0.6F, 4.0))) : swingProgress;
    }

}
