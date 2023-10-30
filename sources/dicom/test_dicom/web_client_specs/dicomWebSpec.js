girderTest.importPlugin('jobs', 'large_image', 'dicomweb');

girderTest.startApp();

describe('DICOMWeb assetstore', function () {
    // maybe see how this is done in other tests -- it may not be necessary
    it('register a user (first is admin)',
        girderTest.createUser('admin',
            'admin@girder.test',
            'Admin',
            'Admin',
            'adminpassword!'));
    it('Create an assetstore and import data', function () {
        var destinationId;
        var destinationType;

        // After importing, we will verify that this item exists
        const verifyItemName = '1.3.6.1.4.1.5962.99.1.3510881361.982628633.1635598486609.2.0';

        runs(function () {
            $('a.g-nav-link[g-target="admin"]').trigger('click');
        });

        waitsFor(function () {
            return $('.g-assetstore-config:visible').length > 0;
        }, 'navigate to admin page');

        runs(function () {
            $('a.g-assetstore-config').trigger('click');
        });

        waitsFor(function () {
            return $('#g-create-dwas-tab').length > 0;
        }, 'create to be visible');

        runs(function () {
            expect($('#g-create-dwas-tab').length);
        });

        runs(function () {
            // Create the DICOMweb assetstore
            $('#g-new-dwas-name').val('DICOMweb');
            $('#g-edit-dwas-url').val('https://idc-external-006.uc.r.appspot.com/dcm4chee-arc/aets/DCM4CHEE/rs');
            $('#g-new-dwas-form input.btn-primary').click();
        });

        waitsFor(function () {
            const assetstores = girder.rest.restRequest({
                url: 'assetstore',
                type: 'GET',
                async: false
            }).responseJSON;
            return assetstores.length === 2 && assetstores[0].type === 'dicomweb';
        }, 'DICOMweb assetstore to be created');

        runs(function () {
            // Select the destinationId and destinationType
            // Get the user ID
            const resp = girder.rest.restRequest({
                url: 'user',
                type: 'GET',
                async: false
            });

            const userId = resp.responseJSON[0]._id;

            // Find the user's public folder
            const resp = girder.rest.restRequest({
                url: 'folder',
                type: 'GET',
                async: false,
                data: {
                    parentType: 'user',
                    parentId: userId,
                    name: 'Public',
                }
            });

            // Use the user's public folder
            destinationType = 'folder';
            destinationId = resp.responseJSON[0]._id;
        });

        runs(function () {
            // Navigate to the import page
            $('.g-dwas-import-button').eq(0).trigger('click');
        });

        waitsFor(function () {
            // Wait for the import page to load
            return $('.g-submit-assetstore-import:visible').length > 0;
        }, 'Import page to load');

        runs(function () {
            // In the import page, trigger a few errors to check validation.
            // Test error when no ID is set.
            $('.g-submit-assetstore-import').trigger('click');
        });

        waitsFor(function () {
            return $('.g-validation-failed-message').html() === 'Invalid Destination ID';
        }, 'Invalid ID check');

        runs(function () {
            // Set dest type and dest id
            $('#g-dwas-import-dest-type').val(destinationType);
            $('#g-dwas-import-dest-id').val(destinationId);

            // Test error for an invalid limit
            $('#g-dwas-import-limit').val('1.3');
            $('.g-submit-assetstore-import').trigger('click');
        });

        waitsFor(function () {
            return $('.g-validation-failed-message').html().includes('Invalid value');
        }, 'Invalid limit check (float)');

        runs(function () {
            // Make sure this is cleared (we will be checking the same message).
            $('.g-validation-failed-message').html('');

            // Test error for negative limit
            $('#g-dwas-import-limit').val('-1');
            $('.g-submit-assetstore-import').trigger('click');
        });

        waitsFor(function () {
            return $('.g-validation-failed-message').html() === 'Invalid limit';
        }, 'Invalid limit check (negative)');

        runs(function () {
            // Fix the limit
            $('#g-dwas-import-limit').val('1');

            // Test error for invalid JSON in the filters parameter
            const filters = '{';
            $('#g-dwas-import-filters').val(filters);
            $('.g-submit-assetstore-import').trigger('click');
        });

        waitsFor(function () {
            return $('.g-validation-failed-message').html().startsWith('Invalid filters');
        }, 'Invalid filters check');

        runs(function () {
            // Perform a search where no results are returned
            const filters = '{"SeriesInstanceUID": "DOES_NOT_EXIST"}';
            $('#g-dwas-import-filters').val(filters);
            $('.g-submit-assetstore-import').trigger('click');
        });

        waitsFor(function () {
            const msg = 'No DICOM objects matching the search filters were found';
            return $('.g-validation-failed-message').html() === msg;
        }, 'No results check');

        runs(function () {
            // Fix the filters
            // We will only import this specific SeriesInstanceUID
            const filters = '{"SeriesInstanceUID": "' + verifyItemName + '"}';
            $('#g-dwas-import-filters').val(filters);

            // This one should work fine
            $('.g-submit-assetstore-import').trigger('click');
        });

        // Verify that the item we were looking for was imported
        waitsFor(function () {
            const items = girder.rest.restRequest({
                url: 'resource/search',
                type: 'GET',
                async: false,
                data: {
                    q: '"' + verifyItemName + '"',
                    types: '["item"]'
                }
            }).responseJSON.item;

            return items.length > 0 && items[0].largeImage !== undefined;
        }, 'Wait for large images to be present');
    });
});
