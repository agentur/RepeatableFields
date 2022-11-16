import React, {PureComponent, Fragment} from 'react';
import PropTypes from 'prop-types';
import Sortable from './Sortable';
import Envelope from './Envelope';

import {connect} from 'react-redux';
import {selectors} from '@neos-project/neos-ui-redux-store';
import I18n from '@neos-project/neos-ui-i18n';
import {neos} from '@neos-project/neos-ui-decorators';
import {$get, $set, $transform, $merge} from 'plow-js';

import style from '../style.css';
import {SortableHandle} from "react-sortable-hoc";
import arrayMove from "array-move";
import backend from '@neos-project/neos-ui-backend-connector';


// const getDataLoaderOptionsForProps = props => ({
// 	contextNodePath: props.focusedNodePath,
// 	dataSourceIdentifier: props.options.dataSourceIdentifier,
// 	// dataSourceUri: props.options.dataSourceUri,
// 	dataSourceAdditionalData: props.options.dataSourceAdditionalData,
// 	dataSourceDisableCaching: Boolean(props.options.dataSourceDisableCaching)
// });
@neos(globalRegistry => ({
    editorRegistry: globalRegistry.get('inspector').get('editors'),
    i18nRegistry: globalRegistry.get('i18n'),
		dataSourcesDataLoader: globalRegistry.get('dataLoaders').get('DataSources')
}))
@connect($transform({
	focusedNodePath: selectors.CR.Nodes.focusedNodePathSelector
}))
export default class Repeatable extends PureComponent {
    emptyGroup = {};

    state = {
        dataTypes: {},
        allowAdd: true,
        allowRemove: true,
        isLoading: true,
				currentValue: []
    };

    static propTypes = {
        identifier: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        // options: PropTypes.object,
        value: PropTypes.arrayOf(PropTypes.object),
        renderSecondaryInspector: PropTypes.func,
        editor: PropTypes.string.isRequired,
        editorRegistry: PropTypes.object.isRequired,
        i18nRegistry: PropTypes.object.isRequired,
        validationErrors: PropTypes.array,
        onEnterKey: PropTypes.func,
        helpMessage: PropTypes.string,
        helpThumbnail: PropTypes.string,
        highlight: PropTypes.bool,

        commit: PropTypes.func.isRequired,
				options: PropTypes.shape({
				buttonAddLabel: PropTypes.string,
				// 	// max: PropTypes.int,
				// 	// min: PropTypes.int,
				// 	controls: PropTypes.shape({
				// 		move: PropTypes.bool,
				// 		remove: PropTypes.bool,
				// 		add: PropTypes.bool
				// 	}),
				//
				// 	properties: PropTypes.objectOf(
				// 		PropTypes.object()
				// 	),
				//
				// 	placeholder: PropTypes.integersOnly,
				// 	// disabled: PropTypes.bool,
				// 	//
				// 	// multiple: PropTypes.bool,
				//
				// 	dataSourceIdentifier: PropTypes.string,
				// 	dataSourceUri: PropTypes.string,
				// 	dataSourceDisableCaching: PropTypes.bool,
				// 	dataSourceAdditionalData: PropTypes.objectOf(PropTypes.any),
				//
				// 	// minimumResultsForSearch: PropTypes.number,
				//
				// 	// values: PropTypes.objectOf(
				// 	// 	PropTypes.shape({
				// 	// 		label: PropTypes.string,
				// 	// 		icon: PropTypes.string,
				// 	// 		preview: PropTypes.string,
				// 	//
				// 	// 		// TODO
				// 	// 		group: PropTypes.string
				// 	// 	})
				// 	// )
				//
				}).isRequired,
			dataSourcesDataLoader: PropTypes.shape({
				resolveValue: PropTypes.func.isRequired
			}).isRequired,
			focusedNodePath: PropTypes.string.isRequired
    };

    componentDidMount() {
        backend.get().endpoints.dataSource('get-property-types', null, {}).then( (json) => {

					// this.loadSelectBoxOptions();
					this.initialValue();
					const value = this.getValue();
					this.testIfAdd(value);
					this.testIfRemove(value);
					this.setState({dataTypes: json, isLoading: false} );
        });
    }

		// componentDidMount() {
		// 	this.loadSelectBoxOptions();
		// }

		componentDidUpdate(prevProps) {
			// if our data loader options have changed (e.g. due to use of ClientEval), we want to re-initialize the data source.
			// if (JSON.stringify(getDataLoaderOptionsForProps(this.props)) !== JSON.stringify(getDataLoaderOptionsForProps(prevProps))) {
			// 	this.loadSelectBoxOptions();
			// }
			if( JSON.stringify((this.props.value)) !== JSON.stringify(prevProps.value) ){
				this.initialValue();
			}
		}

		// loadSelectBoxOptions() {
		// 	if( !this.props.options.dataSourceIdentifier )
		// 		return;
		// 	this.setState({isLoading: true});
		// 	this.props.dataSourcesDataLoader.resolveValue(getDataLoaderOptionsForProps(this.props), this.getValue())
		// 		.then(selectBoxOptions => {
		// 			console.log(selectBoxOptions);
		// 			this.setState({
		// 				isLoading: false,
		// 				// dataSourceConf: selectBoxOptions
		// 				// selectBoxOptions
		// 			});
		// 		});
		// }

    constructor(props){
        super(props);
        const {properties} = props.options;
        if( properties ) {
            (Object.keys(properties)).map((property, index) => {
                this.emptyGroup[property] = properties[property].defaultValue?properties[property].defaultValue:'';
            });
        }
    }

    initialValue = () => {
        const {options, value} = this.props;
				var currentValue = value ? [...value] : [];
        if( options.min ){
            if( currentValue.length < options.min ){
                for(var i=0; i<options.min;++i){
                    if( currentValue[i] ){
											currentValue[i] = value[i];
                    }else{
											currentValue[i] = this.emptyGroup;
                    }
                }
						}
        }
				if( options.max ){
					if(currentValue.length > options.max){
						currentValue = currentValue.slice(0, options.max);
					}
				}
				if( currentValue.length > 0 ){
					for(var key=0;key<currentValue.length; key++){
						var test = {...currentValue[key]};
						test = Object.keys(test).
						filter((key) => this.emptyGroup.hasOwnProperty(key)).
						reduce((cur, key) => { return Object.assign(cur, { [key]: test[key] })}, {});
						currentValue[key] = test;
					}
				}
				this.setState({currentValue: currentValue});
    };

    getValue = () => {
				// this.initialValue();
        const {currentValue} = this.state;
        return currentValue?currentValue:[];
    };

    handleValueChange = (value) => {
        const {commit, options} = this.props;
        commit(value);
				this.testIfAdd(value);
				this.testIfRemove(value);
				this.setState({currentValue: value});
    };

    testIfAdd = (value) => {
        const {options} = this.props;
        if( options.max ) {
            if (options.max > value.length) {
                this.setState({allowAdd: true});
            } else {
                this.setState({allowAdd: false});
            }
        }
    };
    testIfRemove = (value) => {
        const {options} = this.props;
        if( options.min ) {
            if (options.min < value.length) {
                this.setState({allowRemove: true});
            } else {
                this.setState({allowRemove: false});
            }
        }
    };


    handleAdd = () => {
        let value = this.getValue();
        value = [...value, this.emptyGroup];
        this.handleValueChange(value);
    };

    handleRemove = (idx) => {
        const value = this.getValue().filter((s, sidx) => idx !== sidx);
        this.handleValueChange(value);
    };

    commitChange = (idx, property, event) => {
        this.handleValueChange($set(property, event, this.getValue()));

    };

    validateElement = (elementValue, elementConfiguration, idx, identifier) => {
        if (elementConfiguration && elementConfiguration.validation) {
            const validators = elementConfiguration.validation;
            const validationResults = Object.keys(validators).map(validatorName => {
                const validatorConfiguration = validators[validatorName];
                return this.checkValidator(elementValue, validatorName, validatorConfiguration);
            });
            return validationResults.filter(result => result);
        }
    };

    checkValidator = (elementValue, validatorName, validatorConfiguration) => {
        const validator = this.props.validatorRegistry.get(validatorName);
        if (validator) {
            return validator(elementValue, validatorConfiguration);
        }
        console.warn(`Validator ${validatorName} not found`);
    };

    createElement = (idx) => {
        const {options} = this.props;
        const {allowRemove, currentValue} = this.state;
        const DragHandle = SortableHandle(() => <span type="button" className={style['btn-move']}>=</span>);

        return (
            <div className={style['repeatable-wrapper']}>
                {options.controls.move && currentValue.length > 1?(<DragHandle />):''}
                <div className={style['repeatable-field-wrapper']}>
                    {this.getProperties(idx)}
                </div>
                {options.controls.remove && allowRemove?(<button type="button" onClick={() => this.handleRemove(idx)} className={style['btn-delete']}>-</button>):''}
            </div>
        );
    };

    getProperties = (idx) => {
        let properties = [];
        // console.log('getProperties');
        Object.keys(this.emptyGroup).map( (property, index) => {
            properties.push(this.getProperty(property, idx));
        } );
        return properties;
    };

    getProperty = (property, idx) => {
        const {dataTypes, isLoading, dataSourceConf} = this.state;

        // console.log('getProperty');
        const repeatableValue = this.getValue();
        let propertyDefinition = this.props.options.properties[property];
        const defaultDataType = propertyDefinition.type?dataTypes[propertyDefinition.type]:{};

        if( defaultDataType ){
            const merge = require('lodash.merge');
            propertyDefinition = merge(defaultDataType, propertyDefinition);

        }

        const editorOptions = propertyDefinition.editorOptions?propertyDefinition.editorOptions:{};
        const editor = propertyDefinition.editor?propertyDefinition.editor:'Neos.Neos/Inspector/Editors/TextFieldEditor';
        let value = repeatableValue[idx][property]?repeatableValue[idx][property]:'';
        return (
            <Envelope
                identifier={`repeatable-${idx}-${property}`}
                // label={propertyDefinition.label?propertyDefinition.label:''}
                options={editorOptions}
                value={value}
                // renderSecondaryInspector={this.props.renderSecondaryInspector}
                editor={editor}
                editorRegistry={this.props.editorRegistry}
                i18nRegistry={this.props.i18nRegistry}
                validationErrors={this.validateElement(value, propertyDefinition, idx, property)}
                highlight={false}
                property={`${idx}.${property}`}
                id={`repeatable-${idx}-${property}`}
                commit={this.commitChange}
								{...propertyDefinition}
            />);
    };

    onSortAction = ({oldIndex, newIndex}) => {
        this.handleValueChange(arrayMove(this.getValue(), oldIndex, newIndex))
    };

    render() {
        const {options, i18nRegistry} = this.props;
        const {isLoading, allowAdd} = this.state;
				const loadingLabel = i18nRegistry.translate('loading', 'Loading', [], 'Neos.Neos', 'Main');
				const {buttonAddLabel = "Add row"} = options;

        if( !isLoading ){
            return (
                <Fragment>
                    <Sortable
                        element={this.createElement}
                        items={this.getValue()}
                        onSortEndAction={this.onSortAction}
                    />
                    {options.controls.add && allowAdd?(<button type="button" onClick={() => this.handleAdd()} className={style.btn}>{buttonAddLabel}</button>):''}
                </Fragment>
            );
        }else{
            return (
                <div>{loadingLabel}</div>
            );
        }
    }
}
