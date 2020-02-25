package com.fuzs.swordblockingcombat.client;

import net.minecraft.enchantment.EnchantmentHelper;
import net.minecraft.enchantment.Enchantments;
import net.minecraft.item.ItemStack;
import net.minecraft.util.text.ITextComponent;
import net.minecraft.util.text.TranslationTextComponent;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.api.distmarker.OnlyIn;
import net.minecraftforge.event.entity.player.ItemTooltipEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;

import java.util.Arrays;
import java.util.Optional;
import java.util.function.BiPredicate;

@OnlyIn(Dist.CLIENT)
public class SharpnessDamageHandler {

    @SuppressWarnings("unused")
    @SubscribeEvent
    public void onItemTooltip(final ItemTooltipEvent evt) {

        BiPredicate<Object, String> translation = (component, sequence) -> component instanceof TranslationTextComponent
                && ((TranslationTextComponent) component).getKey().contains(sequence);

        // modify attack damage to account for sharpness adding 1.0F instead of mostly 0.5F damage
        int i = EnchantmentHelper.getEnchantmentLevel(Enchantments.SHARPNESS, evt.getItemStack());
        if (i > 1) {

            Optional<Object[]> optionalFormatArgs = Optional.empty();
            for (ITextComponent component : evt.getToolTip()) {

                optionalFormatArgs = component.getSiblings().stream()
                        .filter(it -> translation.test(it, "attribute.modifier.equals."))
                        .map(it -> ((TranslationTextComponent) it).getFormatArgs())
                        .filter(it -> Arrays.stream(it).anyMatch(ti -> translation.test(ti, "attribute.name.generic.attackDamage")))
                        .findFirst();
                if (optionalFormatArgs.isPresent()) {
                    break;
                }
            }

            optionalFormatArgs.ifPresent(formatArgs -> {

                if (formatArgs.length == 2 && formatArgs[0] instanceof String) {

                    final float oldDamage = Float.parseFloat((String) formatArgs[0]);
                    final float damage = -0.5F + i * 0.5F;
                    formatArgs[0] = ItemStack.DECIMALFORMAT.format(oldDamage + damage);
                }
            });
        }
    }

}
