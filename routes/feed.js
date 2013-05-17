
/*
 * GET feed page.
 */

exports.main = function(req, res){
    res.render('feed', { title: 'Twitter feed' });
};