//根据多边形的类名，确定对应的填充颜色。
function polygonFillColor(whichClass) {
    var fill_color;
    switch(whichClass)
    {
        case "subunit firstLevel":  //注意，此处是字符串判断，不同于CSS的多类判断
            fill_color="gold";
            break;
        case "subunit 信息科学部":
            fill_color="#FFB90F";
            break;
        case "subunit 工程与材料科学部":
            fill_color="#EEEE00";
            break;
        case "subunit 数理科学部":
            fill_color="#EEAEEE";
            break;
        case "subunit 地球科学部":
            fill_color="#CDB38B";
            break;
        case "subunit 化学科学部":
            fill_color="#FF8C69";
            break;
        case "subunit 生命科学部":
            fill_color="#7CCD7C";
            break;
        case "subunit 医学科学部":
            fill_color="#87CEFF";
            break;
        case "subunit 管理科学部":
            fill_color="#8968CD";
            break;
        case "subunit the_last_2_layers":
            fill_color="#aabbcc";
            break;
        default:
            fill_color="#aabbcc";
    }

    return fill_color;
}


//在多边形内部标注文字 group代表g标签，features代表要素集，projection代表投影.
function showPolygonLabel(group,features,projection)
{
    var font_size=8;
    switch (group.level){
        case 1:
            font_size=15;
            break;
        case 2:
            font_size=10;
            break;
        case 3:
            font_size=5;
            break;
        default:
            font_size=0;
            break;
    }

    group.selectAll("text")
        .data(features)
        .enter()
        .append("text")
        .attr("x",function (d) {
            var gravityCenter=getGravityCenter(d.geometry.coordinates[0]);//多边形重心，coordinates里的元素是数组
            var projected_zx=projection([gravityCenter.x,gravityCenter.y]);//投影后的重心，返回的是数组[ , ]
            return  projected_zx[0];
        })
        .attr("y",function (d) {
            var gravityCenter=getGravityCenter(d.geometry.coordinates[0]);
            var projected_zx=projection([gravityCenter.x,gravityCenter.y]);
            return  projected_zx[1];
        })
        .attr("class","level"+group.level+"label")
        .style("text-anchor","middle")
        .style("font-size",font_size)
        .text(function (d) { return d.properties.name; });
}