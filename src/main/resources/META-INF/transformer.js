var Opcodes = Java.type('org.objectweb.asm.Opcodes');
var InsnList = Java.type("org.objectweb.asm.tree.InsnList");
var InsnNode = Java.type('org.objectweb.asm.tree.InsnNode');
var VarInsnNode = Java.type('org.objectweb.asm.tree.VarInsnNode');
var FieldInsnNode = Java.type('org.objectweb.asm.tree.FieldInsnNode');
var MethodInsnNode = Java.type('org.objectweb.asm.tree.MethodInsnNode');
var TypeInsnNode = Java.type('org.objectweb.asm.tree.TypeInsnNode');
var JumpInsnNode = Java.type('org.objectweb.asm.tree.JumpInsnNode');
var LdcInsnNode = Java.type('org.objectweb.asm.tree.LdcInsnNode');
var InvokeDynamicInsnNode = Java.type('org.objectweb.asm.tree.InvokeDynamicInsnNode');
var LabelNode = Java.type('org.objectweb.asm.tree.LabelNode');
var FrameNode = Java.type('org.objectweb.asm.tree.FrameNode');

function initializeCoreMod() {

    return {

        // axes only take one damage when attacking
        'tool_item_patch': {
            'target': {
                'type': 'CLASS',
                'name': 'net.minecraft.item.ToolItem'
            },
            'transformer': function(classNode) {
                patchMethod([{
                    obfName: "func_77644_a",
                    name: "hitEntity",
                    desc: "(Lnet/minecraft/item/ItemStack;Lnet/minecraft/entity/LivingEntity;Lnet/minecraft/entity/LivingEntity;)Z",
                    patches: [patchToolItemHitEntity]
                }], classNode, "ToolItem");
                return classNode;
            }
        },

        // disable sweeping without enchantment && more damage from sharpness + impaling
        // make item projectiles cause knockback + damage animation and sound
        'player_entity_patch': {
            'target': {
                'type': 'CLASS',
                'name': 'net.minecraft.entity.player.PlayerEntity'
            },
            'transformer': function(classNode) {
                patchMethod([{
                    obfName: "func_71059_n",
                    name: "attackTargetEntityWithCurrentItem",
                    desc: "(Lnet/minecraft/entity/Entity;)V",
                    patches: [patchPlayerEntityAttackTargetEntityWithCurrentItem1, patchPlayerEntityAttackTargetEntityWithCurrentItem2]
                }, {
                    obfName: "func_70097_a",
                    name: "attackEntityFrom",
                    desc: "(Lnet/minecraft/util/DamageSource;F)Z",
                    patches: [patchPlayerEntityAttackEntityFrom]
                }], classNode, "PlayerEntity");
                return classNode;
            }
        },

        // apply custom attributes for every item
        'item_stack_patch': {
            'target': {
                'type': 'CLASS',
                'name': 'net.minecraft.item.ItemStack'
            },
            'transformer': function(classNode) {
                patchMethod([{
                    obfName: "func_111283_C",
                    name: "getAttributeModifiers",
                    desc: "(Lnet/minecraft/inventory/EquipmentSlotType;)Lcom/google/common/collect/Multimap;",
                    patches: [patchItemStackGetAttributeModifiers]
                }], classNode, "ItemStack");
                return classNode;
            }
        },

        // modify food use duration
        'item_patch': {
            'target': {
                'type': 'CLASS',
                'name': 'net.minecraft.item.Item'
            },
            'transformer': function(classNode) {
                patchMethod([{
                    obfName: "func_77626_a",
                    name: "getUseDuration",
                    desc: "(Lnet/minecraft/item/ItemStack;)I",
                    patches: [patchItemGetUseDuration]
                }], classNode, "Item");
                return classNode;
            }
        },

        // modify food level required for sprinting
        'client_player_entity_patch': {
            'target': {
                'type': 'CLASS',
                'name': 'net.minecraft.client.entity.player.ClientPlayerEntity'
            },
            'transformer': function(classNode) {
                patchMethod([{
                    obfName: "func_70636_d",
                    name: "livingTick",
                    desc: "()V",
                    patches: [patchClientPlayerEntityLivingTick]
                }], classNode, "ClientPlayerEntity");
                return classNode;
            }
        },

        // swing through grass
        'game_renderer_patch': {
            'target': {
                'type': 'CLASS',
                'name': 'net.minecraft.client.renderer.GameRenderer'
            },
            'transformer': function(classNode) {
                patchMethod([{
                    obfName: "func_78473_a",
                    name: "getMouseOver",
                    desc: "(F)V",
                    patches: [patchGameRendererGetMouseOver1, patchGameRendererGetMouseOver2]
                }], classNode, "GameRenderer");
                return classNode;
            }
        },

        // emphasize swing attack
        'living_entity_patch': {
            'target': {
                'type': 'CLASS',
                'name': 'net.minecraft.entity.LivingEntity'
            },
            'transformer': function(classNode) {
                patchMethod([{
                    obfName: "func_70678_g",
                    name: "getSwingProgress",
                    desc: "(F)F",
                    patches: [patchLivingEntityGetSwingProgress]
                }], classNode, "LivingEntity");
                return classNode;
            }
        }
    };
}

function patchMethod(entries, classNode, name) {

    log("Patching " + name + "...");
    for (var i = 0; i < entries.length; i++) {

        var entry = entries[i];
        var method = findMethod(classNode.methods, entry);
        var flag = !!method;
        if (flag) {

            var obfuscated = !method.name.equals(entry.name);
            for (var j = 0; j < entry.patches.length; j++) {

                var patch = entry.patches[j];
                if (!patchInstructions(method, patch.filter, patch.action, obfuscated)) {

                    flag = false;
                }
            }
        }

        log("Patching " + name + "#" + entry.name + (flag ? " was successful" : " failed"));
    }
}

function findMethod(methods, entry) {

    for (var i = 0; i < methods.length; i++) {

        var method = methods[i];
        if ((method.name.equals(entry.obfName) || method.name.equals(entry.name)) && method.desc.equals(entry.desc)) {

            return method;
        }
    }
}

function patchInstructions(method, filter, action, obfuscated) {

    var instructions = method.instructions.toArray();
    for (var i = 0; i < instructions.length; i++) {

        var node = filter(instructions[i], obfuscated);
        if (!!node) {

            break;
        }
    }

    if (!!node) {

        action(node, method.instructions, obfuscated);
        return true;
    }
}

var patchPlayerEntityAttackEntityFrom = {
    filter: function(node, obfuscated) {
        if (node instanceof VarInsnNode && node.getOpcode().equals(Opcodes.FLOAD) && node.var.equals(2)) {
            var nextNode = node.getNext();
            if (nextNode instanceof InsnNode && nextNode.getOpcode().equals(Opcodes.FCONST_0)) {
                nextNode = nextNode.getNext();
                if (nextNode instanceof InsnNode && nextNode.getOpcode().equals(Opcodes.FCMPL)) {
                    return node;
                }
            }
        }
    },
    action: function(node, instructions, obfuscated) {
        var insnList = new InsnList();
        insnList.add(new VarInsnNode(Opcodes.ALOAD, 0));
        insnList.add(new VarInsnNode(Opcodes.ALOAD, 1));
        insnList.add(new VarInsnNode(Opcodes.FLOAD, 2));
        insnList.add(new MethodInsnNode(Opcodes.INVOKESPECIAL, "net/minecraft/entity/LivingEntity", obfuscated ? "func_70097_a" : "attackEntityFrom", "(Lnet/minecraft/util/DamageSource;F)Z", false));
        insnList.add(new InsnNode(Opcodes.IRETURN));
        instructions.insertBefore(node, insnList);
    }
};

var patchLivingEntityGetSwingProgress = {
    filter: function(node, obfuscated) {
        if (node instanceof InsnNode && node.getOpcode().equals(Opcodes.FRETURN)) {
            return node;
        }
    },
    action: function(node, instructions, obfuscated) {
        var insnList = new InsnList();
        insnList.add(new VarInsnNode(Opcodes.ALOAD, 0));
        insnList.add(new VarInsnNode(Opcodes.FLOAD, 1));
        insnList.add(generateHook("getSwingProgress", "(FLnet/minecraft/entity/LivingEntity;F)F"));
        instructions.insertBefore(node, insnList);
    }
};

var patchGameRendererGetMouseOver1 = {
    filter: function(node, obfuscated) {
        if (node instanceof VarInsnNode && node.getOpcode().equals(Opcodes.ALOAD) && node.var.equals(2)) {
            var nextNode = node.getNext();
            if (nextNode instanceof InsnNode && nextNode.getOpcode().equals(Opcodes.FCONST_1)) {
                nextNode = nextNode.getNext();
                if (matchesNode(nextNode, "net/minecraft/entity/Entity", obfuscated ? "func_70676_i" : "getLook", "(F)Lnet/minecraft/util/math/Vec3d;")) {
                    return node;
                }
            }
        }
    },
    action: function(node, instructions, obfuscated) {
        var insnList = new InsnList();
        insnList.add(new VarInsnNode(Opcodes.FLOAD, 1));
        insnList.add(new VarInsnNode(Opcodes.ALOAD, 2));
        insnList.add(new VarInsnNode(Opcodes.DLOAD, 3));
        insnList.add(new VarInsnNode(Opcodes.DLOAD, 8));
        insnList.add(generateHook("rayTraceCollidingBlocks", "(FLnet/minecraft/entity/Entity;DD)D"));
        insnList.add(new VarInsnNode(Opcodes.DSTORE, 8));
        instructions.insert(node, insnList);
    }
};

var patchGameRendererGetMouseOver2 = {
    filter: function(node, obfuscated) {
        if (node instanceof InsnNode && node.getOpcode().equals(Opcodes.RETURN)) {
            return  node;
        }
    },
    action: function(node, instructions, obfuscated) {
        var insnList = new InsnList();
        insnList.add(generateHook("applyCoyoteTime", "()V"));
        instructions.insertBefore(node, insnList);
    }
};

var patchClientPlayerEntityLivingTick = {
    filter: function(node, obfuscated) {
        if (matchesNode(node, "net/minecraft/util/FoodStats", obfuscated ? "func_75116_a" : "getFoodLevel", "()I")) {
            var nextNode = node.getNext();
            if (nextNode instanceof InsnNode && nextNode.getOpcode().equals(Opcodes.I2F)) {
                nextNode = nextNode.getNext();
                if (nextNode instanceof LdcInsnNode) {
                    return nextNode;
                }
            }
        }
    },
    action: function(node, instructions, obfuscated) {
        var insnList = new InsnList();
        insnList.add(generateHook("getSprintingLevel", "(F)F"));
        instructions.insert(node, insnList);
    }
};

var patchItemGetUseDuration = {
    filter: function(node, obfuscated) {
        if (node instanceof VarInsnNode && node.getOpcode().equals(Opcodes.ALOAD) && node.var.equals(0)) {
            var nextNode = getNthNode(node, 2);
            if (matchesNode(nextNode, "net/minecraft/item/Food", obfuscated ? "func_221465_e" : "isFastEating", "()Z")) {
                return node;
            }
        }
    },
    action: function(node, instructions, obfuscated) {
        var insnList = new InsnList();
        insnList.add(generateHook("getFoodDuration", "(Lnet/minecraft/item/Item;)I"));
        insnList.add(new InsnNode(Opcodes.IRETURN));
        instructions.insert(node, insnList);
    }
};

var patchItemStackGetAttributeModifiers = {
    filter: function(node, obfuscated) {
        // name is the same for obfuscated as it's a Forge method
        if (matchesNode(node, "net/minecraft/item/Item", obfuscated ? "getAttributeModifiers" : "getAttributeModifiers", "(Lnet/minecraft/inventory/EquipmentSlotType;Lnet/minecraft/item/ItemStack;)Lcom/google/common/collect/Multimap;")) {
            var nextNode = node.getNext();
            if (nextNode instanceof VarInsnNode && nextNode.getOpcode().equals(Opcodes.ASTORE)) {
                return  node;
            }
        }
    },
    action: function(node, instructions, obfuscated) {
        var insnList = new InsnList();
        insnList.add(new VarInsnNode(Opcodes.ALOAD, 1));
        insnList.add(new VarInsnNode(Opcodes.ALOAD, 0));
        insnList.add(generateHook("adjustAttributeMap", "(Lcom/google/common/collect/Multimap;Lnet/minecraft/inventory/EquipmentSlotType;Lnet/minecraft/item/ItemStack;)Lcom/google/common/collect/Multimap;"));
        instructions.insert(node, insnList);
    }
};

var patchPlayerEntityAttackTargetEntityWithCurrentItem1 = {
    filter: function(node, obfuscated) {
        if (node instanceof InsnNode && node.getOpcode().equals(Opcodes.D2F)) {
            var nextNode = node.getNext();
            if (nextNode instanceof VarInsnNode && nextNode.getOpcode().equals(Opcodes.FSTORE) && nextNode.var.equals(2)) {
                nextNode = node.getPrevious();
                if (matchesNode(nextNode, "net/minecraft/entity/ai/attributes/IAttributeInstance", obfuscated ? "func_111126_e" : "getValue", "()D")) {
                    return node;
                }
            }
        }
    },
    action: function(node, instructions, obfuscated) {
        var insnList = new InsnList();
        insnList.add(new VarInsnNode(Opcodes.ALOAD, 0));
        insnList.add(new VarInsnNode(Opcodes.ALOAD, 1));
        insnList.add(generateHook("addEnchantmentDamage", "(FLnet/minecraft/entity/player/PlayerEntity;Lnet/minecraft/entity/Entity;)F"));
        instructions.insert(node, insnList);
    }
};

var patchPlayerEntityAttackTargetEntityWithCurrentItem2 = {
    filter: function(node, obfuscated) {
        if (node instanceof VarInsnNode && node.getOpcode().equals(Opcodes.ILOAD) && node.var.equals(10)) {
            var nextNode = node.getNext();
            if (nextNode instanceof JumpInsnNode && nextNode.getOpcode().equals(Opcodes.IFEQ)) {
                return  node;
            }
        }
    },
    action: function(node, instructions, obfuscated) {
        var insnList = new InsnList();
        insnList.add(new VarInsnNode(Opcodes.ALOAD, 0));
        insnList.add(new VarInsnNode(Opcodes.ALOAD, 1));
        insnList.add(new VarInsnNode(Opcodes.FLOAD, 2));
        insnList.add(new MethodInsnNode(Opcodes.INVOKESTATIC, "com/fuzs/swordblockingcombat/asm/Hooks", "doSweeping", "(ZLnet/minecraft/entity/player/PlayerEntity;Lnet/minecraft/entity/Entity;F)V", false));
        insnList.add(new VarInsnNode(Opcodes.ALOAD, 0));
        insnList.add(new VarInsnNode(Opcodes.ILOAD, 7));
        insnList.add(new MethodInsnNode(Opcodes.INVOKESTATIC, "com/fuzs/swordblockingcombat/asm/Hooks", "restoreSprinting", "(Lnet/minecraft/entity/player/PlayerEntity;I)V", false));
        insnList.add(new InsnNode(Opcodes.ICONST_0));
        instructions.insert(node, insnList);
    }
};

var patchToolItemHitEntity = {
    filter: function(node, obfuscated) {
        if (node instanceof InsnNode && node.getOpcode().equals(Opcodes.ICONST_2)) {
            var nextNode = node.getNext();
            if (nextNode instanceof VarInsnNode && nextNode.getOpcode().equals(Opcodes.ALOAD) && nextNode.var.equals(3)) {
                nextNode = node.getPrevious();
                if (nextNode instanceof VarInsnNode && nextNode.getOpcode().equals(Opcodes.ALOAD) && nextNode.var.equals(1)) {
                    return node;
                }
            }
        }
    },
    action: function(node, instructions, obfuscated) {
        var insnList = new InsnList();
        insnList.add(new VarInsnNode(Opcodes.ALOAD, 0));
        insnList.add(generateHook("hitEntityAmount", "(Lnet/minecraft/item/ToolItem;)I"));
        instructions.insert(node, insnList);
        instructions.remove(node);
    }
};

function matchesNode(node, owner, name, desc) {

    return node instanceof MethodInsnNode && node.owner.equals(owner) && node.name.equals(name) && node.desc.equals(desc);
}

function generateHook(name, desc) {

    return new MethodInsnNode(Opcodes.INVOKESTATIC, "com/fuzs/swordblockingcombat/asm/Hooks", name, desc, false);
}

function getNthNode(node, n) {

    for (var i = 0; i < Math.abs(n); i++) {

        if (n < 0) {

            node = node.getPrevious();
        } else {

            node = node.getNext();
        }
    }

    return node;
}

function log(message) {

    print("[Sword Blocking Combat Transformer]: " + message);
}