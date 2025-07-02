const express = require('express');
const router = express.Router();
const recordsController = require('../controllers/recordsController');

router.get('/', recordsController.getAllRecords);

router.get('/:id', recordsController.getRecordById);

router.post('/', recordsController.addRecord);

router.put('/:id', recordsController.updateRecord);

router.delete('/:id', recordsController.deleteRecord);

router.get('/city/:city', recordsController.getBirthsByCity);


module.exports = router;
