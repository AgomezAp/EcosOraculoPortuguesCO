"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const datos_1 = require("../controllers/datos");
const router = (0, express_1.Router)();
router.post('/api/registrar', datos_1.registrarDatos);
exports.default = router;
